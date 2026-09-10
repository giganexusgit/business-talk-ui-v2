import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

// ──────────────────────────────────────────────────────────────────────────
// PRODUCTION CREDENTIAL TRANSPORT VALIDATION
// ──────────────────────────────────────────────────────────────────────────
// After backend fix: SameSite=None, Secure=true, httpOnly=true
// Frontend must send credentials on ALL auth-related requests for proper
// cookie transport on cross-origin (HTTPS-required) configurations.

const validateProductionEnvironment = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return

  try {
    const apiUrl = new URL(API_BASE_URL, window.location.origin)
    const appProto = window.location.protocol
    const apiProto = apiUrl.protocol

    // SameSite=None requires Secure=true which requires HTTPS
    const isHttps = appProto === 'https:' && apiProto === 'https:'
    if (!isHttps) {
      console.warn(
        '[credential-transport] ⚠️ PRODUCTION: Frontend and backend must both use HTTPS for SameSite=None cookies. ' +
        `Frontend: ${appProto}//, Backend: ${apiProto}//`
      )
    }

    // Cross-origin cookie transport enabled
    const isCrossOrigin = window.location.origin !== apiUrl.origin
    if (isCrossOrigin) {
      console.log('[credential-transport] ✅ Cross-origin auth enabled', {
        frontend: window.location.origin,
        backend: apiUrl.origin,
        note: 'SameSite=None + Secure=true required on backend cookies',
      })
    }
  } catch (e) {
    console.warn('[credential-transport] Failed to validate production environment', { error: String(e) })
  }
}

// ─── Token-refresh queue ───────────────────────────────────────────────────
// Shared state so concurrent 401s only trigger one refresh call.
let isRefreshing = false
let failedRequestQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

const PUBLIC_AUTH_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/google-success',
]

const LAST_LOGIN_AT_KEY = 'auth:last_login_at'
// Increased stabilization window to avoid premature forced logout during brief refresh races
const AUTH_STABILIZATION_MS = 120_000

let authHydratingInProgress = false

const getLastLoginAt = (): number => {
  if (typeof window === 'undefined') return 0
  const value = Number(localStorage.getItem(LAST_LOGIN_AT_KEY) || '0')
  return Number.isFinite(value) ? value : 0
}

const isWithinRecentLoginWindow = (): boolean => {
  const lastLoginAt = getLastLoginAt()
  return lastLoginAt > 0 && Date.now() - lastLoginAt <= AUTH_STABILIZATION_MS
}

const shouldTraceAuthRequest = (url?: string): boolean => {
  const path = String(url || '')
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/signup') ||
    path.includes('/auth/me') ||
    path.includes('/auth/refresh-token') ||
    path.includes('/auth/logout')
  )
}

const processQueue = (error: unknown) => {
  failedRequestQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(null)
  })
  failedRequestQueue = []
}
// ──────────────────────────────────────────────────────────────────────────

// Extend Axios config type to allow a custom _retry flag
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

class ApiClient {
  private client: AxiosInstance
  private rolesCache: any[] | null = null

  /**
   * Fetches all roles from the backend and caches them for this instance.
   */
  async fetchRoles(forceRefresh = false): Promise<any[]> {
    if (!this.rolesCache || forceRefresh) {
      const res = await this.getRoles()
      this.rolesCache = Array.isArray(res.data) ? res.data : []
    }
    return this.rolesCache
  }

  /**
   * Finds a role by name (case-insensitive) from the cached or fetched roles.
   */
  async getRoleIdByName(roleName: string): Promise<string | undefined> {
    const roles = await this.fetchRoles()
    const found = roles.find((r: any) =>
      typeof r.name === 'string' && r.name.toLowerCase() === roleName.toLowerCase()
    )
    return found?.id
  }

  setAuthHydrating(isHydrating: boolean) {
    authHydratingInProgress = isHydrating
  }

  markRecentLogin() {
    if (typeof window === 'undefined') return
    localStorage.setItem(LAST_LOGIN_AT_KEY, String(Date.now()))
  }

  getRecentLoginTimestamp() {
    return getLastLoginAt()
  }

  private logCrossOriginDiagnostics() {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return
    try {
      const appOrigin = window.location.origin
      const apiOrigin = new URL(API_BASE_URL, appOrigin).origin
      const appUrl = new URL(appOrigin)
      const apiUrl = new URL(apiOrigin)
      const sameOrigin = appOrigin === apiOrigin
      const sameHost = appUrl.hostname === apiUrl.hostname
      const protocolMismatch = appUrl.protocol !== apiUrl.protocol
      const localHostMismatch =
        (appUrl.hostname === 'localhost' && apiUrl.hostname !== 'localhost') ||
        (appUrl.hostname !== 'localhost' && apiUrl.hostname === 'localhost')

      console.log('[auth-cookie] origin diagnostics', {
        appOrigin,
        apiOrigin,
        sameOrigin,
        sameHost,
        protocolMismatch,
        localHostMismatch,
        note:
          !sameOrigin
            ? 'Cross-origin cookie auth requires backend cookie SameSite=None and Secure on HTTPS.'
            : 'Same-origin cookie auth path.',
      })
    } catch {
      console.log('[auth-cookie] origin diagnostics failed to parse API base URL', {
        API_BASE_URL,
      })
    }
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    })

    this.client.interceptors.request.use((config) => {
      // Force credentialed requests for session-cookie auth across browsers.
      config.withCredentials = true

      if (process.env.NODE_ENV === 'development' && shouldTraceAuthRequest(config.url)) {
        console.log('[auth-request] start', {
          method: config.method,
          url: config.url,
          withCredentials: config.withCredentials,
          note: 'Credentials REQUIRED for cross-origin cookie transport',
        })
      }

      return config
    })

    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (!error.response) return Promise.reject(error)

        const originalRequest = error.config as RetryableRequestConfig
        const requestUrl = String(originalRequest?.url || '')
        const status = Number(error.response.status)
        const responseCode = String(error.response?.data?.code || '')
        const responseMessage = String(
          error.response?.data?.message ||
          error.response?.data?.error ||
          ''
        ).toLowerCase()

        // ── 1. Handle banned / restricted accounts (no refresh attempt) ──
        const isRestrictedResponse =
          status === 423 ||
          responseCode === 'ACCOUNT_RESTRICTED' ||
          ((status === 401 || status === 403) &&
            (responseMessage.includes('banned') ||
              responseMessage.includes('restricted')))

        if (isRestrictedResponse && typeof window !== 'undefined') {
          // Per spec: DO NOT logout the user immediately — keep session data
          // so the restricted page can show their info.
          window.dispatchEvent(new CustomEvent('account-restricted'))
          if (window.location.pathname !== '/account-restricted') {
            window.location.href = '/account-restricted'
          }
          return Promise.reject(error)
        }

        // ── 1b. 403 not related to account restriction → notify UI ──
        if (status === 403 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('action-forbidden'))
        }

        // ── 2. Handle 401 with silent token refresh + request retry ──────
        const isRefreshEndpoint = requestUrl.includes('/auth/refresh-token')
        const isPublicAuthEndpoint =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/signup') ||
          requestUrl.includes('/auth/forgot-password') ||
          requestUrl.includes('/auth/reset-password')

        if (
          status === 401 &&
          !originalRequest?._retry &&
          !isRefreshEndpoint &&
          !isPublicAuthEndpoint
        ) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[auth-refresh] 401 intercepted', {
              requestUrl,
              isRefreshing,
            })
          }

          // If a refresh is already in-flight, queue this request and wait.
          if (isRefreshing) {
            originalRequest._retry = true
            return new Promise((resolve, reject) => {
              failedRequestQueue.push({ resolve, reject })
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err))
          }

          originalRequest._retry = true
          isRefreshing = true

          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('[auth-refresh] refresh started', {
                withCredentials: true, // ✅ CRITICAL for cross-origin
                note: 'Sending cookies from previous login',
              })
            }

            // Ask the server to issue a new access_token using the refresh cookie.
            const refreshRes = await this.client.post('/auth/refresh-token', undefined, {
              withCredentials: true,
            })

            if (process.env.NODE_ENV === 'development') {
              console.log('[auth-refresh] refresh succeeded', {
                status: refreshRes?.status,
                cookiesPreserved: true, // ✅ Refresh cookie still valid
              })
            }

            processQueue(null)
            // Retry the original request with the new access_token cookie.
            return this.client(originalRequest)
          } catch (refreshError) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[auth-refresh] refresh failed', {
                authHydratingInProgress,
                withinRecentLoginWindow: isWithinRecentLoginWindow(),
              })
            }

            processQueue(refreshError)

            const shouldDeferForcedLogout =
              authHydratingInProgress ||
              isWithinRecentLoginWindow()

            if (shouldDeferForcedLogout) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[auth-refresh] defer forced logout during auth stabilization')
              }
              return Promise.reject(refreshError)
            }

            // Refresh failed → session is truly expired → force logout.
            if (typeof window !== 'undefined') {
              const isOnPublicAuthPage = PUBLIC_AUTH_PATHS.some(
                (path) =>
                  window.location.pathname === path ||
                  window.location.pathname.startsWith(`${path}/`)
              )

              if (process.env.NODE_ENV === 'development') {
                console.log('[auth-refresh] forcing redirect to login after refresh exhaustion', {
                  requestUrl,
                  pathname: window.location.pathname,
                })
              }

              localStorage.removeItem('user')

              const isGuest =
                !localStorage.getItem('user')

              if (isGuest) {
                window.dispatchEvent(
                  new CustomEvent('show-login-modal')
                )

                return Promise.reject(refreshError)
              }

              if (
                !isOnPublicAuthPage &&
                window.location.pathname !== '/login'
              ) {
                window.location.href = '/login'
              }
            }
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
          }
        }

        return Promise.reject(error)
      }
    )

    validateProductionEnvironment()
    this.logCrossOriginDiagnostics()
  }

  // =========================
  // 🔐 AUTH
  // =========================

  async login(email: string, password: string) {
    const res = await this.client.post(
      '/auth/login',
      {
        email,
        password,
      },
      {
        withCredentials: true,
      }
    )

    this.markRecentLogin()

    if (process.env.NODE_ENV === 'development') {
      const cookies = typeof document !== 'undefined' ? document.cookie : ''
      const hasCookies = cookies.length > 0
      const cookieNames = cookies
        ? cookies.split(';').map((c) => c.trim().split('=')[0]).filter(Boolean)
        : []
      
      // Capture Set-Cookie headers from response
      const setCookieHeaders = res?.headers?.['set-cookie'] || []
      const setCookieCount = Array.isArray(setCookieHeaders) ? setCookieHeaders.length : 0
      
      console.log('[auth] login response received', {
        status: res?.status,
        hasData: Boolean(res?.data),
        credentialsSent: true, // ✅ withCredentials: true forced on request
        credentialsReceived: hasCookies,
        cookieCount: cookieNames.length,
        cookieNames,
        setCookieHeaders: setCookieCount, // How many cookies backend sent
      })

      // ⚠️ CRITICAL: If backend sent cookies but they're not in document.cookie
      if (setCookieCount > 0 && !hasCookies) {
        console.warn(
          '[auth] ❌ CRITICAL: Backend sent Set-Cookie headers but cookies NOT accessible in document.cookie!',
          {
            setCookieCount,
            reason: 'Cross-origin cookies (localhost:4001 → localhost:4000) require backend SameSite=None or SameSite=Lax',
            solution: 'Backend must set cookies with correct SameSite and Domain flags for cross-domain localhost access',
            setCookieHeaders: setCookieHeaders.map((h: string) => h.split(';')[0]), // Just show the cookie=value part
          }
        )
      }
    }

    return res
  }

  async signup(
    email: string,
    username: string,
    password: string,
    phone_number?: string
  ) {
    // Dynamically fetch the role_id for the 'user' role
    const userRoleId = await this.getRoleIdByName('user')
    if (!userRoleId) {
      throw new Error('User role not found in roles list')
    }
    const createRes = await this.client.post(
      '/auth/signup',
      {
        email,
        username,
        password,
        phone_number,
        role_id: userRoleId,
      },
      {
        withCredentials: true,
      }
    )

    if (createRes.data.UserExist) {
      throw new Error('User already exists')
    }

    return createRes
  }

  async logout() {
    await this.client.post('/auth/logout', undefined, { withCredentials: true })

    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  async deleteAccount(password: string) {
    return this.client.delete('/users/delete-account', {
      data: { password },
      withCredentials: true,
    })
  }

  // =========================
  // 👤 PROFILE
  // =========================

  getMyProfileinfo() {
    return this.client.get('/user/profile')
  }

  getMyProfile() {
    return this.client.get('/auth/me', { withCredentials: true })
  }

  // Admin: change email with password verification
  async changeAdminEmail(newEmail: string, password: string) {
    return this.client.patch('/admin/change-email', { newEmail, password })
  }

  getDashboardStats() {
    return this.client.get('/user/dashboard-stats')
  }

  getUserActivity(
    page = 1,
    limit = 10,
  ) {
    return this.client.get(
      '/user/activity',
      {
        params: {
          page,
          limit,
        },
      }
    )
  }

  getUserById(id: string) {
    return this.client.get(`/user/${id}`)
  }

  getUserActivityById(
    userId: string,
    page = 1,
    limit = 10
  ) {
    return this.client.get(
      `/user/${userId}/activity`,
      {
        params: {
          page,
          limit,
        },
      }
    )
  }

  async completeProfile(data: any) {
    let body: string | FormData

    if (data.profile_photo) {
      const form = new FormData()

      Object.entries(data).forEach(([key, value]) => {
        if (key === 'skills' && Array.isArray(value)) {
          value.forEach((v) => form.append('skills', v))
        } else if (value !== undefined && value !== null) {
          if (
            typeof value === 'object' &&
            !(value instanceof File) &&
            !(value instanceof Blob)
          ) {
            form.append(key, JSON.stringify(value))
          } else {
            form.append(key, value as string | Blob)
          }
        }
      })

      body = form
    } else {
      body = JSON.stringify(data)
    }

    const res = await fetch(`${API_BASE_URL}/user/me`, {
      method: 'PATCH',
      credentials: 'include', // ✅ CRITICAL: Required for cross-origin cookie transport
      // Safari/iOS MUST have credentials: 'include' on PATCH to send auth cookies
      // This is necessary for SameSite=None + Secure=true backend configuration
      headers:
        body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' },
      body,
    })

    if (!res.ok) throw new Error(await res.text())

    const user = await res.json()

    return { data: user }
  }

  // =========================
  // 🌐 GENERIC METHODS (FIX)
  // =========================

  get(url: string, config?: any) {
    return this.client.get(url, config)
  }

  post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config)
  }

  patch(url: string, data?: any, config?: any) {
    return this.client.patch(url, data, config)
  }

  delete(url: string, config?: any) {
    return this.client.delete(url, config)
  }


  // =========================
  // 📰 POSTS / FEED
  // =========================

  getHotPosts() {
    return this.client.get('/posts/hot')
  }

  getTrendingPosts() {
    return this.client.get('/trending/posts')
  }

  getForYouFeed(
    page = 1,
    limit = 50
  ) {
    return this.client.get(
      '/posts/feed/for-you',
      {
        params: {
          page,
          limit,
        },
      }
    )
  }

  getFollowingFeed(
    page = 1,
    limit = 50
  ) {
    return this.client.get(
      '/posts/feed/following',
      {
        params: {
          page,
          limit,
        },
      }
    )
  }

  getAllPosts(page = 1, limit = 50) {
    return this.client.get('/posts/all',
      {
        params: {
          page,
          limit,
        },
      }
    )
  }

  createPost(data: any) {
    return this.client.post('/posts', data)
  }

  likePost(id: string) {
    return this.client.post(`/posts/${id}/like`)
  }

  // More post-related APIs can be added here (update, delete, etc.)
  // Get single post (also increments view)
  getPostById(id: string) {
    return this.client.get(`/posts/${id}`)
  }

  // Share post
  sharePost(id: string) {
    return this.client.get(`/posts/${id}/share`)
  }

  // Tag feed
  getPostsByTags(tags: string[]) {
    return this.client.get('/posts/feed/tag', {
      params: { tags: tags.join(',') },
    })
  }

  // Explore feed
  getExploreFeed(page = 1, limit = 50) {
    return this.client.get('/posts/feed/explore', {
      params: {
        page,
        limit,
      },
    })
  }

  // =========================
  // 🗳️ POST & COMMENT VOTING
  // =========================

  // Vote on a post (UP / DOWN)
  async votePost(postId: string, vote: 'up' | 'down') {
    const res = await this.client.post(`/posts/${postId}/vote`, {
      vote: vote.toLowerCase(), // backend expects up/down
    })
    return res.data
  }

  // Vote on a comment (UP / DOWN) — generic post comments
  async voteComment(commentId: string, vote: 'up' | 'down') {
    const res = await this.client.post(`/comments/${commentId}/vote`, {
      vote: vote.toLowerCase(),
    })
    return res.data
  }

  // Vote on a blog/story comment — POST /blogs/:blogId/comments/:commentId/vote
  async voteBlogComment(blogId: string, commentId: string, vote: 'up' | 'down') {
    const res = await this.client.post(`/blogs/${blogId}/comments/${commentId}/vote`, {
      vote: vote.toLowerCase(),
    })
    return res.data
  }

  // =========================
  // 💬 COMMENTS
  // =========================

  // Add comment or reply
  async addPostComment(
    postId: string,
    comment: string,
    parent_id?: string
  ) {
    const res = await this.client.post(
      `/posts/${postId}/comments`,
      parent_id
        ? { comment, parent_id }
        : { comment }
    )
    return res.data
  }

  // Get all comments of a post
  async getPostComments(postId: string) {
    const res = await this.client.get(`/posts/${postId}/comments`)
    return res.data
  }

  // Delete a post (author only)
  deletePost(id: string) {
    return this.client.delete(`/posts/${id}`)
  }

  updatePost(id: string, data: any) {
    if (data instanceof FormData) {
      return this.client.put(`/posts/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return this.client.put(`/posts/${id}`, data)
  }

  // Delete a post comment (author only)
  deletePostComment(id: string) {
    return this.client.delete(`/posts/comments/${id}`)
  }

  // =========================
  // 📰 STORIES
  // =========================

  async getStories(page = 1, limit = 50) {
    const res = await this.client.get('/blogs', {
      params: {
        page,
        limit,
      },
    })

    const payload = res.data || {}

    return {
      ...payload,
      data: (payload.data || payload || []).filter(
        (b: any) => b.type === 'STORY'
      ),
    }
  }

  async getTrendingStories() {
    const res = await this.client.get('/trending/blogs')
    return {
      data: (res.data || []).filter((b: any) => b.type === 'STORY'),
    }
  }

  // =========================
  // 📰 BLOG / STORY INTERACTIONS
  // =========================

  async getBlogs(page = 1, limit = 50, tag?: string, search?: string) {
    const params: any = { page, limit }
    if (tag && tag !== 'All') {
      params.tag = tag
    }
    if (search && search.trim()) {
      params.search = search.trim()
    }

    const res = await this.client.get('/blogs', { params })

    const payload = res.data || {}

    return {
      ...payload,
      data: (payload.data || payload || []).filter(
        (b: any) =>
          b.type === 'BLOG' ||
          b.type === 'ADMIN_BLOG'
      ),
    }
  }

  getTrendingBlogs() {  
    return this.client.get('/trending/blogs')
  }

  getBlogById(id: string) {
    return this.client.get(`/blogs/${id}`)
  }

  // Create blog
  createBlog(formData: FormData) {
    return this.client.post('/blogs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // Update blog (ADMIN_BLOG only on backend)
  updateBlog(id: string, data: FormData | Record<string, unknown>): Promise<AxiosResponse<any>> {
    if (data instanceof FormData) {
      return this.client.patch(`/blogs/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    return this.client.patch(`/blogs/${id}`, data)
  }

  // Delete blog
  deleteBlog(id: string) {
    return this.client.delete(`/blogs/${id}`)
  }

  // Delete a blog comment (author only)
  deleteBlogComment(id: string) {
    return this.client.delete(`/blogs/comments/${id}`)
  }

  // Share blog
  shareBlog(id: string) {
    return this.client.get(`/blogs/${id}/share`)
  }

  // Like / Unlike blog (Story)
  async likeBlog(id: string) {
    return this.client.post(`/blogs/${id}/like`)
  }

  // Get blog comments
  async getBlogComments(id: string) {
    const res = await this.client.get(`/blogs/${id}/comments`)
    return res.data
  }

  // Add blog comment / reply
  async addBlogComment(
    id: string,
    content: string,
    parent_id?: string
  ) {
    const res = await this.client.post(
      `/blogs/${id}/comments`,
      parent_id
        ? { content, parent_id }
        : { content }
    )
    return res.data
  }

  // =========================
  // 👥 FOLLOW
  // =========================

  followUserById(id: string) {
    return this.client.post(`/follow/${id}`)
  }

  unfollowUserById(id: string) {
    return this.client.delete(`/follow/${id}/unfollow`)
  }

  getFollowSuggestions() {
    return this.client.get('/follow/suggestions')
  }

  getFollowers(id: string) {
    return this.client.get(`/follow/${id}/followers`)
  }

  getFollowing(id: string) {
    return this.client.get(`/follow/${id}/following`)
  }

  acceptConnectionRequest(id: string) {
    return this.client.post(`/connections/accept/${id}`)
  }

  deleteConnectionRequest(id: string) {
    return this.client.delete(`/connections/request/${id}`)
  }

  // =========================
  // 💬 CHAT (FIXED)
  // =========================

  getConversations() {
    return this.client.get('/chat/my/conversations')
  }

  // FIXED — cursor pagination: pass `before` (Unix ms string) to load older messages
  getMessages(conversationId: string, cursor?: string, limit = 50) {
    return this.client.get(`/chat/${conversationId}/messages`, {
      params: {
        ...(cursor ? { before: cursor } : {}),
        limit,
      },
    })
  }

  sendMessage(conversationId: string, content: string) {
    return this.client.post(`/chat/${conversationId}/message`, {
      messageType: 'text',
      content,
    })
  }

  sendMessageWithAttachment(
    conversationId: string,
    content: string,
    file?: File,
    options?: { onUploadProgress?: (progressEvent: any) => void }
  ) {
    const formData = new FormData()
    if (file) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const msgType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file'
      formData.append('file', file)
      formData.append('messageType', msgType)
    } else {
      formData.append('messageType', 'text')
    }
    if (content) {
      formData.append('content', content)
    }

    return this.client.post(`/chat/${conversationId}/message`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: options?.onUploadProgress,
    })
  }

  startConversation(userIds: string[]) {
    return this.client.post('/chat/start', {
      userIds,
    })
  }

  /**
   * Finds an existing 1-on-1 conversation with targetUserId, or creates a new one.
   * Returns { id: string } — the conversation id to navigate to.
   */
  async getOrCreateConversation(targetUserId: string): Promise<{ id: string }> {
    // 1. Fetch existing conversations
    const res = await this.getConversations()
    const convList: any[] = res.data ?? []

    // 2. Look for an existing 1-on-1 conversation with the target user
    const existing = convList.find((c: any) => {
      const conv = c.conversation ?? c
      if (conv.isGroup) return false
      return (conv.participants ?? []).some(
        (p: any) => String(p.user?.id ?? p.userId ?? '') === String(targetUserId)
      )
    })

    if (existing) {
      const conv = existing.conversation ?? existing
      return { id: conv.id }
    }

    // 3. None found — create a new conversation
    const createRes = await this.startConversation([targetUserId])
    const created = createRes.data
    return { id: created?.id ?? created?.conversationId }
  }

  // =========================
  // 🔔 NOTIFICATIONS
  // =========================

  getMyNotifications() {
    return this.client.get('/notification')
  }

  markNotificationAsRead(id: string) {
    return this.client.patch(`/notification/${id}/read`)
  }

  markAllNotificationsRead() {
    return this.client.patch('/notification/mark-all-read')
  }

  getUnreadNotificationCount() {
    return this.client.get('/notification/unread-count')
  }

  // =========================
  // 🔔 ADMIN NOTIFICATIONS
  // =========================

  getAdminNotifications(page = 1, limit = 50) {
    return this.client.get('/admin/notifications', {
      params: { page, limit },
    })
  }

  getAdminUnreadNotificationCount() {
    return this.client.get('/admin/notifications/unread-count')
  }

  markAdminNotificationAsRead(id: string) {
    return this.client.patch(`/admin/notifications/${id}/read`)
  }

  markAllAdminNotificationsRead() {
    return this.client.patch('/admin/notifications/mark-all-read')
  }

  // =========================
  // 🔍 SEARCH
  // =========================

  searchAll(query: string, type = 'all', page = 1, limit = 50) {
    return this.client.get('/search', {
      params: { q: query, type, page, limit },
    })
  }

  searchSuggestions(query: string) {
    return this.client.get('/search/suggest', {
      params: { q: query },
    })
  }

  // =========================
  // 📊 ANALYTICS (ADMIN)
  // =========================

  getActivityAnalytics(days = 7) {
    return this.client.get('/admin/analytics/activity', {
      params: { days },
    })
  }

  getEngagementAnalytics(days = 7) {
    return this.client.get('/admin/analytics/engagement', {
      params: { days },
    })
  }

  getTopPosts() {
    return this.client.get('/admin/analytics/top-posts')
  }

  getTopUsers() {
    return this.client.get('/admin/analytics/top-users')
  }

  getGrowthAnalytics(days = 7) {
    return this.client.get('/admin/analytics/growth', {
      params: { days },
    })
  }

  // =========================
  // 🚨 REPORTS SYSTEM
  // =========================

  // Create report
  createReport(payload: {
    content_type: string
    content_id: string
    reason: string
  }) {
    return this.client.post('/reports', payload)
  }

  // Get reports (admin)
  getReports(status?: string, page = 1, limit = 50) {
    return this.client.get('/admin/reports', {
      params: { status, page, limit },
    })
  }

  // Resolve report
  resolveReport(id: string, action: string) {
    return this.client.patch(`/admin/reports/${id}/resolve`, {
      action,
    })
  }

  // =========================
  // 👤 ROLES APIs
  // =========================

  getRoles() {
    return this.client.get('/roles')
  }

  getRoleById(id: string) {
    return this.client.get(`/roles/${id}`)
  }

  createRole(data: any) {
    return this.client.post('/roles', data)
  }

  updateRole(id: string, data: any) {
    return this.client.patch(`/roles/${id}`, data)
  }

  deleteRole(id: string) {
    return this.client.delete(`/roles/${id}`)
  }

  // =========================
  // 👥 GROUP APIs (FULL)
  // =========================

  // 1. CREATE GROUP (supports optional cover image)
  async createGroup(data: FormData) {
    return this.client.post('/groups', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  // 2. GET ALL GROUPS
  getGroups() {
    return this.client.get('/groups')
  }

  // 2a. GET SUGGESTED GROUPS
  getGroupSuggestions(limit = 10) {
    return this.client.get('/groups/suggestions', { params: { limit } })
  }

  // 2b. GET MY JOINED GROUPS
  getMyGroups() {
    return this.client.get('/groups/me')
  }

  // 2c. GET MY PENDING JOIN REQUESTS
  getMyRequestedGroups() {
    return this.client.get('/groups/me/requested')
  }

  // 3. GET GROUP BY ID
  getGroupById(id: string) {
    return this.client.get(`/groups/${id}`)
  }

  // 4. JOIN GROUP
  joinGroup(groupId: string) {
    return this.client.post(`/groups/${groupId}/join`)
  }

  // 5. LEAVE GROUP
  leaveGroup(groupId: string) {
    return this.client.delete(`/groups/${groupId}/leave`)
  }

  // 6. GET GROUP BY SLUG
  getGroupBySlug(slug: string) {
    return this.client.get(`/groups/slug/${slug}`)
  }

  // 7. GET GROUP CHAT
  getGroupChat(groupId: string) {
    return this.client.get(`/groups/${groupId}/chat`)
  }

  // 7b. GET OR CREATE GROUP CHAT (backend ensures idempotency)
  getGroupChatOrCreate(groupId: string) {
    return this.client.post(`/groups/${groupId}/chat`)
  }

  // 8. GENERATE INVITE LINK (admin only)
  generateGroupInvite(groupId: string, data?: { expiresIn?: number; maxUses?: number }) {
    return this.client.post(`/groups/${groupId}/invite`, data ?? {})
  }

  // 9. JOIN BY INVITE CODE
  joinGroupByInviteCode(code: string) {
    return this.client.post(`/groups/invite/${code}/join`)
  }

  // 10. REQUEST TO JOIN PRIVATE GROUP
  requestToJoinGroup(groupId: string) {
    return this.client.post(`/groups/${groupId}/request`)
  }

  // 11. GET PENDING JOIN REQUESTS (admin)
  getGroupJoinRequests(groupId: string) {
    return this.client.get(`/groups/${groupId}/requests`)
  }

  // 12. APPROVE JOIN REQUEST
  approveGroupJoinRequest(requestId: string) {
    return this.client.post(`/groups/requests/${requestId}/approve`)
  }

  // 13. REJECT JOIN REQUEST
  rejectGroupJoinRequest(requestId: string) {
    return this.client.post(`/groups/requests/${requestId}/reject`)
  }

  // 14. CREATE POST INSIDE GROUP
  createGroupPost(groupId: string, data: { type: string; content?: string; tags?: string | string[] }) {
    return this.client.post(`/groups/${groupId}/posts`, data)
  }

  // 14a. CREATE POST INSIDE GROUP (with media)
  createGroupPostWithMedia(groupId: string, formData: FormData) {
    return this.client.post(`/groups/${groupId}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // 15. GET GROUP FEED (paginated)
  getGroupFeed(groupId: string, page = 1, limit = 50) {
    return this.client.get(`/groups/${groupId}/feed`, { params: { page, limit } })
  }

  // 16. REMOVE GROUP MEMBER (admin)
  removeGroupMember(groupId: string, userId: string) {
    return this.client.delete(`/groups/${groupId}/member/${userId}`)
  }

  // 17. TOGGLE MEMBER ROLE ADMIN <-> MEMBER
  toggleGroupMemberRole(groupId: string, userId: string) {
    return this.client.patch(`/groups/${groupId}/member/${userId}`)
  }

  // 18. UPDATE GROUP RULES
  updateGroupRules(groupId: string, rules: string[]) {
    return this.client.patch(`/groups/${groupId}/rules`, { rules })
  }

  // =========================
  // 🔐 AUTH — ADDITIONAL
  // =========================

  refreshToken() {
    return this.client.post('/auth/refresh-token', undefined, { withCredentials: true })
  }

  changePassword(data: { userId?: string; password: string }) {
    return this.client.post('/auth/change-password', data)
  }

  forgotPassword(email: string) {
    return this.client.post('/auth/forgot-password', { email })
  }

  resetPassword(token: string, password: string) {
    return this.client.post('/auth/reset-password', { token, password })
  }

  getAuthProfile() {
    return this.client.get('/auth/profile')
  }

  // =========================
  // 👤 USER — ADDITIONAL
  // =========================

  createUser(formData: FormData) {
    return this.client.post('/user', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  getAllUsers() {
    return this.client.get('/user')
  }

  updateProfile(formData: FormData) {
    return this.client.patch('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  updateUserById(id: string, formData: FormData) {
    return this.client.patch(`/user/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  deleteUserById(id: string) {
    return this.client.delete(`/user/${id}`)
  }

  // =========================
  // 📰 POSTS — ADDITIONAL
  // =========================

  // Create post with optional media files (multipart)
  createPostWithMedia(formData: FormData) {
    return this.client.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  // =========================
  // 💬 CHAT — ADDITIONAL
  // =========================

  deleteMessage(messageId: string) {
    return this.client.delete(`/chat/message/${messageId}`)
  }

  addUserToConversation(conversationId: string, userId: string) {
    return this.client.post(`/chat/${conversationId}/add-user`, { userId })
  }

  removeUserFromConversation(conversationId: string, userId: string) {
    return this.client.post(`/chat/${conversationId}/remove-user`, { userId })
  }

  renameConversation(conversationId: string, title: string) {
    return this.client.post(`/chat/${conversationId}/rename`, { title })
  }

  getChatPresence() {
    return this.client.get('/chat/presence')
  }

  sendRichMessage(
    conversationId: string,
    data: { messageType: 'text' | 'blog' | 'post'; content?: string; blogId?: string; postId?: string }
  ) {
    return this.client.post(`/chat/${conversationId}/message`, data)
  }

  /**
   * Mark all messages in a conversation as read for the current user.
   * Backend should mark messages delivered/seen and update unread counters server-side.
   */
  markConversationRead(conversationId: string) {
    return this.client.patch(`/chat/${conversationId}/read`)
  }

  // =========================
  // 🛡️ ADMIN — ADDITIONAL
  // =========================

  shadowBanUser(userId: string) {
    return this.client.patch(`/admin/users/${userId}/shadow-ban`)
  }

  unshadowBanUser(userId: string) {
    return this.client.patch(`/admin/users/${userId}/unshadow-ban`)
  }

  uploadAdminMedia(file: File) {
    const form = new FormData()
    form.append('file', file)
    return this.client.post('/admin/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  getAdminMedia(page = 1, type?: 'image' | 'video') {
    return this.client.get('/admin/media', { params: { page, type } })
  }

  getPendingContent() {
    return this.client.get('/admin/content')
  }

  approveContent(id: string, type: 'post' | 'blog') {
    return this.client.patch(`/admin/content/${id}/approve`, null, { params: { type } })
  }

  rejectContent(id: string, type: 'post' | 'blog', reason?: string) {
    return this.client.patch(`/admin/content/${id}/reject`, reason ? { reason } : undefined, { params: { type } })
  }

  deleteAdminContent(id: string, type: 'post' | 'blog') {
    return this.client.delete(`/admin/content/${id}`, { params: { type } })
  }

  createAdminDraft(data: { type: string; content: Record<string, unknown> }) {
    return this.client.post('/admin/drafts', data)
  }

  getAdminDrafts() {
    return this.client.get('/admin/drafts')
  }

  updateAdminDraft(id: string, data: { type?: string; content?: Record<string, unknown> }) {
    return this.client.patch(`/admin/drafts/${id}`, data)
  }

  publishAdminDraft(id: string) {
    return this.client.post(`/admin/drafts/${id}/publish`)
  }

  deleteAdminDraft(id: string) {
    return this.client.delete(`/admin/drafts/${id}`)
  }

  getAdminFeedback(type?: 'issue' | 'suggestion' | 'bug') {
    return this.client.get('/admin/feedback', { params: type ? { type } : undefined })
  }

  resolveAdminFeedback(id: string) {
    return this.client.patch(`/admin/feedback/${id}/resolve`)
  }

  // =========================
  // 🖼️ MEDIA LIBRARY
  // =========================

  uploadMedia(file: File) {
    const form = new FormData()
    form.append('file', file)
    return this.client.post('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  getMediaLibrary(page = 1, type?: 'image' | 'video') {
    return this.client.get('/media', { params: { page, type } })
  }

  // =========================
  // 🔖 SAVED CONTENT
  // =========================

  saveContent(contentId: string, contentType: 'post' | 'blog') {
    return this.client.post('/saved', { contentId, contentType })
  }

  unsaveContent(contentId: string, contentType: 'post' | 'blog') {
    return this.client.delete('/saved', { data: { contentId, contentType } })
  }

  getSavedContent(page = 1) {
    return this.client.get('/saved', { params: { page } })
  }

  // =========================
  // 🖼️ GALLERY
  // =========================

  getGallery(page = 1, type: 'media' | 'saved' | 'all' = 'all') {
    return this.client.get('/gallery', { params: { page, type } })
  }

  // =========================
  // 🏷️ TAGS
  // =========================

  getTrendingTags() {
    return this.client.get('/tags/trending')
  }

  getTagsHealth() {
    return this.client.get('/tags/health')
  }

  // =========================
  // 📈 TRENDING
  // =========================

  getTrendingHealth() {
    return this.client.get('/trending/health')
  }

  // =========================
  // 💬 FEEDBACK
  // =========================

  submitFeedback(data: { type: 'issue' | 'suggestion' | 'bug'; message: string }) {
    return this.client.post('/feedback', data)
  }

  // =========================
  // 📝 DRAFTS (USER)
  // =========================

  saveDraft(data: { type: string; autoSaved?: boolean; content: Record<string, unknown> }) {
    return this.client.post('/drafts', data)
  }

  getDrafts() {
    return this.client.get('/drafts')
  }

  getDraftById(id: string) {
    return this.client.get(`/drafts/${id}`)
  }

  updateDraft(id: string, data: { type?: string; autoSaved?: boolean; content?: Record<string, unknown> }) {
    return this.client.patch(`/drafts/${id}`, data)
  }

  deleteDraft(id: string) {
    return this.client.delete(`/drafts/${id}`)
  }

  publishDraft(id: string) {
    return this.client.post(`/drafts/${id}/publish`)
  }

  // =========================
  // ⚕️ HEALTH CHECKS
  // =========================

  getAIHealth() {
    return this.client.get('/ai/health')
  }

  getMonetizationHealth() {
    return this.client.get('/monetization/health')
  }

  // =========================
  // 🔐 GOOGLE OAUTH
  // =========================

  // Returns the Google OAuth redirect URL — navigate browser to this URL to initiate OAuth
  getGoogleAuthUrl() {
    return `${API_BASE_URL}/auth/google`
  }

  // =========================
  // 🛡️ ADMIN — USER MODERATION
  // =========================

  getAdminDashboard() {
    return this.client.get('/admin/dashboard')
  }

  warnUser(userId: string) {
    return this.client.patch(`/admin/users/${userId}/warn`)
  }

  banUser(userId: string) {
    return this.client.patch(`/admin/users/${userId}/ban`)
  }

  unbanUser(userId: string) {
    return this.client.patch(`/admin/users/${userId}/unban`)
  }

  // =========================
  // 👤 USER CONTENT (profile page)
  // =========================

  getUserPosts(userId: string, page = 1, limit = 50) {
    return this.client.get('/posts', { params: { author: userId, page, limit } })
  }

  getUserBlogs(userId: string, page = 1, limit = 50) {
    return this.client.get('/blogs', { params: { author: userId, page, limit } })
  }

  getUserComments(userId: string, page = 1, limit = 50) {
    return this.client.get(`/user/${userId}/comments`, { params: { page, limit } })
  }

  getUserStats(userId: string) {
    return this.client.get(`/user/${userId}/stats`)
  }

  // =========================
  // 🔔 PUSH NOTIFICATIONS (FCM)
  // =========================

  /**
   * Register a push token with the backend (req 7).
   * The server should store the token per-user for sending pushes.
   */
  // Devices
  registerOrUpdateDevice(payload: {
    token: string
    platform: 'android' | 'ios' | 'web'
    device_name?: string
    app_version?: string
  }) {
    return this.client.post('/push/devices', payload)
  }

  listMyDevices() {
    return this.client.get('/push/devices')
  }

  patchDevice(deviceId: string, data: { is_muted?: boolean }) {
    return this.client.patch(`/push/devices/${deviceId}`, data)
  }

  deactivateDevice(deviceId: string) {
    return this.client.delete(`/push/devices/${deviceId}`)
  }

  deactivateAllDevices() {
    return this.client.delete('/push/devices')
  }

  // Topics
  subscribeDeviceToTopics(deviceId: string, topics: string[]) {
    return this.client.post(`/push/devices/${deviceId}/topics`, { topics })
  }

  unsubscribeDeviceFromTopics(deviceId: string, topics: string[]) {
    return this.client.delete(`/push/devices/${deviceId}/topics`, { data: { topics } })
  }

  // Scheduled pushes
  createScheduledPush(payload: {
    title: string
    body: string
    deep_link?: string | null
    collapse_key?: string | null
    data?: Record<string, unknown>
    send_at: number
  }) {
    return this.client.post('/push/scheduled', payload)
  }

  listScheduledPushes() {
    return this.client.get('/push/scheduled')
  }

  cancelScheduledPush(id: string) {
    return this.client.delete(`/push/scheduled/${id}`)
  }

  // Analytics / admin
  getPushAnalytics(days = 7) {
    return this.client.get('/push/analytics', { params: { days } })
  }

  // Cron/admin: prune stale tokens
  cleanupPushTokens() {
    return this.client.post('/push/cleanup')
  }

  // Convenience / backwards-compatible wrappers
  registerPushToken(token: string, platform: 'android' | 'ios' | 'web' = 'web') {
    return this.registerOrUpdateDevice({ token, platform })
  }

  unregisterPushToken(token: string) {
    // Keep previous behavior if backend still supports /push/unregister
    try {
      return this.client.post('/push/unregister', { token })
    } catch (e) {
      // Fallback: attempt to find and deactivate matching device(s) server-side via /push/devices
      return this.client.delete('/push/devices', { data: { token } })
    }
  }

  updatePushPreferences(preferences: Record<string, boolean>) {
    return this.client.patch('/push/preferences', preferences)
  }
}

const apiClient = new ApiClient();
export default apiClient;

export const extractPaginatedData = (res: any) => {
  const payload = res?.data

  if (Array.isArray(payload)) {
    return {
      data: payload,
      page: 1,
      limit: payload.length,
      hasMore: false,
    }
  }

  return {
    data: payload?.data ?? [],
    page: payload?.page ?? 1,
    limit: payload?.limit ?? 10,
    hasMore: payload?.hasMore ?? false,
  }
}
