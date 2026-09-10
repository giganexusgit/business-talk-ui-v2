'use client'

import { useRouter, useParams } from 'next/navigation'
import { Lock, Globe, MessageCircle, Share2, ClipboardList, MapPin, X, Check, Image as ImageIcon, Video, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ShareModal } from '@/components/shared/ShareModal'
import apiClient from '@/lib/api-client'
import { FeedPost } from '@/components/user/FeedPost'
import { profileHref } from '@/lib/profile-link'

interface GroupMember {
  id: string
  name: string
  avatar: string
  title: string
}

interface GroupPost {
  id: string
  author: GroupMember
  content: string
  image?: string
  video?: string
  timestamp: string | number
  likes: number
  dislikes: number
  comments: number
  sends: number
}

interface Group {
  id: string
  name: string
  description: string
  image: string
  members: number
  posts: number
  type: 'public' | 'private'
  joined: boolean
  category: string
  requested: boolean
  ownerId: string
  membersList: GroupMember[]
  recentPosts: GroupPost[]
  about: string
}

interface GroupJoinRequest {
  id: string
  user?: {
    id?: string
    full_name?: string
    username?: string
    profile_photo?: string
    profession?: string
    location?: string
  }
  userId?: string
  created_on?: string | number
}

const mapGroupFeedPost = (post: any): GroupPost => {
  const firstImage = post.media?.find((item: any) => item.type === 'image')
  const firstVideo = post.media?.find((item: any) => item.type === 'video')
  const user = post.user || post.createdBy || post.author || {}

  return {
    id: post.id,
    author: {
      id: user.id || post.userId || post.createdById || '',
      name: user.full_name || user.username || user.name || 'Unknown',
      avatar:
        user.profile_photo ||
        `https://ui-avatars.com/api/name=${encodeURIComponent(user.full_name || user.username || 'User')}`,
      title: user.profession || 'Member',
    },
    content: post.content || '',
    image: firstImage?.url || post.image || undefined,
    video: firstVideo?.url || post.video || undefined,
    timestamp: post.created_on || post.createdAt || Date.now(),
    likes: Number(post.upvotes ?? post.likes ?? post.likes_count ?? 0),
    dislikes: Number(post.downvotes ?? post.dislikes ?? 0),
    comments: Number(post.commentsCount ?? post.comment_count ?? post.comments ?? 0),
    sends: Number(post.sends ?? post.shares ?? 0),
  }
}

const extractFeedItems = (payload: any): any[] => {
  if (Array.isArray(payload?.posts)) return payload.posts
  if (Array.isArray(payload?.data?.posts)) return payload.data.posts
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

const extractFeedTotal = (payload: any, fallback: number): number => {
  return Number(
    payload?.total ??
      payload?.pagination?.total ??
      payload?.data?.total ??
      payload?.data?.pagination?.total ??
      fallback
  )
}

const normalizeJoinRequests = async (rawRequests: any[]) => {
  return Promise.all(
    rawRequests.map(async (req: any) => {
      const existingUser = req?.user || req?.requestedBy || req?.requester || null
      const fallbackUserId = req?.userId || req?.requestedById || req?.requesterId || existingUser?.id

      if (existingUser) {
        return {
          ...req,
          user: existingUser,
        }
      }

      if (!fallbackUserId) {
        return req
      }

      try {
        const userRes = await apiClient.getUserById(String(fallbackUserId))
        return {
          ...req,
          user: userRes?.data || null,
        }
      } catch {
        return {
          ...req,
          user: {
            id: String(fallbackUserId),
            username: `User ${String(fallbackUserId).slice(0, 8)}`,
          },
        }
      }
    })
  )
}

const formatGroup = (
  g: any,
  joined = false,
  requested = false
): Group => ({
  id: g.id,
  name: g.name,
  description: g.description,
  image: g.cover_image || `https://ui-avatars.com/api/name=${encodeURIComponent(g.name || 'Group')}`,
  members: Number(g.memberCount ?? g.membersCount ?? g.members_count ?? g.member_count ?? (Array.isArray(g.members) ? g.members.length : 0)) || 0,
  posts: Number(g.postCount ?? g.postsCount ?? g.posts_count ?? g.post_count ?? g.totalPosts ?? (Array.isArray(g.posts) ? g.posts.length : 0)) || 0,
  type: (g.visibility === 'PRIVATE' ? 'private' : 'public') as 'public' | 'private',
  joined: joined || g.isJoined || false,
  requested: requested || g.isRequested || false,
  ownerId: g.created_by || g.createdBy || g.owner?.id || '',
  category: 'General',
  membersList: (g.members || []).map((m: any) => ({
    id: m.userId || m.user?.id || '',
    name: m.user?.full_name || m.user?.username || m.user?.name || 'User',
    avatar:
      m.user?.profile_photo ||
      `https://ui-avatars.com/api/name=${encodeURIComponent(m.user?.full_name || m.user?.username || 'User')}`,
    title: m.role,
  })),
  recentPosts: [],
  about: g.description,
})

export default function GroupDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [requestPending, setRequestPending] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)
  const [postNotice, setPostNotice] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [requests, setRequests] = useState<GroupJoinRequest[]>([])
  const [requestAction, setRequestAction] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null)
  const [feedTab, setFeedTab] = useState<'feed' | 'about'>('feed')
  const [groupFeed, setGroupFeed] = useState<GroupPost[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchGroupFeed = useCallback(
    async (
      pageNumber = 1,
      append = false
    ) => {
      if (!groupId) return

      try {
        if (pageNumber === 1) {
          setFeedLoading(true)
        } else {
          setLoadingMore(true)
        }

        const res = await apiClient.getGroupFeed(
          groupId,
          pageNumber,
          20
        )

        const items = extractFeedItems(res.data)

        const mapped = items.map(mapGroupFeedPost)

        setGroupFeed(prev =>
          append
            ? [...prev, ...mapped]
            : mapped
        )

        setHasMore(
          res.data?.hasMore ??
          mapped.length === 20
        )

        setGroup(prev =>
          prev
            ? {
                ...prev,
                posts: extractFeedTotal(
                  res.data,
                  mapped.length
                ),
              }
            : prev
        )
      } catch (err) {
        console.error('Group feed fetch error', err)
      } finally {
        setFeedLoading(false)
        setLoadingMore(false)
      }
    },
    [groupId]
  )


  useEffect(() => {
    if (!groupId) return

    setPage(1)

    fetchGroupFeed(1, false)
  }, [groupId, fetchGroupFeed])

  // ── Media upload state ──────────────────────────────────────────────────
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      setCurrentUserId(user.id || '')
    } catch {
      setCurrentUserId('')
    }
  }, [])

  useEffect(() => {
    if (!groupId) return

    const fetchGroup = async () => {
      try {
        const [groupRes, myRes, requestedRes] = await Promise.all([
          apiClient.getGroupById(groupId),
          apiClient.getMyGroups(),
          apiClient.getMyRequestedGroups(),
        ])
        const g = groupRes.data

        const myGroupIds = new Set(
          (myRes.data || []).map((item: any) => (item.group ?? item).id)
        )
        const requestedGroupIds = new Set(
          (requestedRes.data || []).map((item: any) => (item.group ?? item).id)
        )

        const formatted = formatGroup(
          g,
          myGroupIds.has(g.id),
          requestedGroupIds.has(g.id)
        )

        setGroup(formatted)
        setIsJoined(formatted.joined)
        setRequestPending(formatted.requested)
      } catch (err) {
        console.error('Group fetch error', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupId])

  // useEffect(() => {
  //   if (!groupId) return

  //   const fetchGroupFeed = async (
  //     pageNumber = 1,
  //     append = false
  //   ) => {
  //     try {
  //       if (pageNumber === 1) {
  //         setFeedLoading(true)
  //       } else {
  //         setLoadingMore(true)
  //       }

  //       const res = await apiClient.getGroupFeed(
  //         groupId,
  //         pageNumber,
  //         20
  //       )

  //       const items = extractFeedItems(res.data)

  //       const mapped = items.map(mapGroupFeedPost)

  //       setGroupFeed(prev =>
  //         append ? [...prev, ...mapped] : mapped
  //       )

  //       setHasMore(
  //         res.data?.hasMore ??
  //         mapped.length === 20
  //       )
  //     } finally {
  //       setFeedLoading(false)
  //       setLoadingMore(false)
  //     }
  //   }

  //   fetchGroupFeed()
  // }, [groupId])

  if (loading) {
    return <div className="p-6">Loading group...</div>
  }

  const handleJoin = async () => {
    if (!group) return

    try {
      if (isJoined) {
        await apiClient.leaveGroup(group.id)
        setIsJoined(false)
        setRequestPending(false)
        setGroup((prev) => (prev ? { ...prev, joined: false, requested: false } : prev))
      } else if (requestPending) {
        // request already sent — no cancel endpoint
        return
      } else if (group.type === 'private') {
        await apiClient.requestToJoinGroup(group.id)
        setRequestPending(true)
        setGroup((prev) => (prev ? { ...prev, requested: true, joined: false } : prev))
      } else {
        await apiClient.joinGroup(group.id)
        setIsJoined(true)
        setRequestPending(false)
        setGroup((prev) => (prev ? { ...prev, joined: true, requested: false } : prev))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const isGroupOwner = Boolean(group && currentUserId && (group.ownerId === currentUserId || group.membersList.some((m: any) => m.id === currentUserId && String(m.title || '').toUpperCase() === 'OWNER')))

  const handleCreateGroupPost = async () => {
    if (!group || (!postContent.trim() && mediaFiles.length === 0)) return

    try {
      setPosting(true)
      setPostNotice(null)
      setUploadProgress(0)

      if (mediaFiles.length > 0) {
        // Multipart upload with media
        const formData = new FormData()
        formData.append('type', 'NORMAL')
        formData.append('content', postContent.trim())
        mediaFiles.forEach((file) => formData.append('media', file))

        await apiClient.createGroupPostWithMedia(group.id, formData)
      } else {
        await apiClient.createGroupPost(group.id, {
          type: 'NORMAL',
          content: postContent.trim(),
          tags: [],
        })
      }

      setPostContent('')
      setMediaFiles([])
      setMediaPreviews([])
      setUploadProgress(0)
      setPostNotice('Post created successfully.')

      setPage(1)
      await fetchGroupFeed(1, false)
    } catch (err) {
      console.error('Failed to create group post', err)
      setPostNotice('Failed to create post. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    // Max 4 total files
    const remaining = 4 - mediaFiles.length
    const accepted = files.slice(0, remaining)
    setMediaFiles((prev) => [...prev, ...accepted])
    accepted.forEach((file) => {
      const url = URL.createObjectURL(file)
      setMediaPreviews((prev) => [...prev, { url, type }])
    })
    e.target.value = ''
  }

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setMediaPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleOpenGroupMessage = async () => {    if (!group || openingChat) return

    try {
      setOpeningChat(true)
      let res = await apiClient.getGroupChat(group.id)

      let conversationId =
        res?.data?.id ||
        res?.data?.conversationId ||
        res?.data?.conversation?.id

      // Fallback: GET endpoint returned no conversation — create it
      if (!conversationId) {
        res = await apiClient.getGroupChatOrCreate(group.id)
        conversationId =
          res?.data?.id ||
          res?.data?.conversationId ||
          res?.data?.conversation?.id
      }

      if (conversationId) {
        router.push(`/messages?conversationId=${conversationId}`)
      } else {
        router.push('/messages')
      }
    } catch (err) {
      console.error('Failed to open group chat', err)
      router.push('/messages')
    } finally {
      setOpeningChat(false)
    }
  }

  const fetchGroupRequests = async () => {
    if (!group) return
    try {
      setRequestsLoading(true)
      setRequestsError(null)
      const res = await apiClient.getGroupJoinRequests(group.id)
      const rawRequests = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : []
      const normalized = await normalizeJoinRequests(rawRequests)
      setRequests(normalized)
    } catch (err) {
      console.error('Failed to fetch join requests', err)
      setRequestsError('Failed to load requests. Please try again.')
      setRequests([])
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleOpenRequestsModal = async () => {
    setShowRequestsModal(true)
    await fetchGroupRequests()
  }

  const handleApproveFromModal = async (requestId: string) => {
    try {
      setRequestAction({ id: requestId, type: 'approve' })
      await apiClient.approveGroupJoinRequest(requestId)
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(requestId)))
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              members: (prev.members || 0) + 1,
            }
          : prev
      )
    } catch (err) {
      console.error('Failed to approve join request', err)
      setRequestsError('Failed to approve request. Please try again.')
    } finally {
      setRequestAction(null)
    }
  }

  const handleRejectFromModal = async (requestId: string) => {
    try {
      setRequestAction({ id: requestId, type: 'reject' })
      await apiClient.rejectGroupJoinRequest(requestId)
      setRequests((prev) => prev.filter((r) => String(r.id) !== String(requestId)))
    } catch (err) {
      console.error('Failed to reject join request', err)
      setRequestsError('Failed to reject request. Please try again.')
    } finally {
      setRequestAction(null)
    }
  }

  const handleGenerateInvite = async () => {
    if (!group) return

    try {
      setInviteLoading(true)
      setInviteMessage(null)

      const res = await apiClient.generateGroupInvite(group.id)
      const inviteCode =
        res?.data?.inviteCode ||
        res?.data?.code ||
        res?.data?.invite_code

      if (!inviteCode) {
        setInviteMessage('Invite created, but no code was returned.')
        return
      }

      const inviteUrl = `${window.location.origin}/invite/${inviteCode}`

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl)
        setInviteMessage('Invite link copied to clipboard.')
      } else {
        setInviteMessage(`Invite code: ${inviteCode}`)
      }
    } catch (err) {
      console.error('Failed to generate invite link', err)
      setInviteMessage('Failed to generate invite link. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  if (!group) {
    return (
      <div className="p-6 text-center" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
        <p style={{ color: '#5F6368' }}>Group not found</p>
      </div>
    )
  }

  const adminCount = Math.max(
    1,
    group.membersList.filter((member) => {
      const role = String(member.title || '').toUpperCase()
      return role === 'ADMIN' || role === 'OWNER'
    }).length
  )

  const renderCreatePostSection = () => (
    <div
      className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6"
      style={{ border: '1px solid #E8E8E8' }}
    >
      <h2 className="text-xl font-bold mb-3" style={{ color: '#212529' }}>
        Create Post
      </h2>

      <textarea
        value={postContent}
        onChange={(e) => setPostContent(e.target.value)}
        placeholder={isJoined ? 'Share something with this group...' : 'Join the group to create a post'}
        disabled={!isJoined || posting}
        className="w-full min-h-[120px] p-4 rounded-xl resize-none bg-gray-50 border"
      />

      {/* Media previews */}
      {mediaPreviews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {mediaPreviews.map((preview, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border" style={{ borderColor: '#E8E8E8' }}>
              {preview.type === 'image' ? (
                <img src={preview.url} alt={`preview-${i}`} className="w-full h-full object-cover" />
              ) : (
                <video src={preview.url} className="w-full h-full object-cover" muted />
              )}
              <button
                onClick={() => handleRemoveMedia(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {posting && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gray-800 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-xs mt-1" style={{ color: '#5F6368' }}>{uploadProgress}% uploaded</p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleMediaSelect(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => handleMediaSelect(e, 'video')}
      />

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Media buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={!isJoined || posting || mediaFiles.length >= 4}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: '#E8E8E8', color: '#5F6368' }}
            title="Add image"
          >
            <ImageIcon className="w-4 h-4" /> Photo
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={!isJoined || posting || mediaFiles.length >= 4}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: '#E8E8E8', color: '#5F6368' }}
            title="Add video"
          >
            <Video className="w-4 h-4" /> Video
          </button>
        </div>

        <button
          onClick={handleCreateGroupPost}
          disabled={!isJoined || posting || (!postContent.trim() && mediaFiles.length === 0)}
          className="w-full sm:w-auto px-5 py-2 rounded-lg font-medium border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: '#212529',
            color: '#212529',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = '#212529'
              e.currentTarget.style.color = '#FFFFFF'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#212529'
          }}
        >
          {posting ? 'Posting...' : 'Create Post'}
        </button>
      </div>

      {postNotice && (
        <p className="text-sm mt-3" style={{ color: postNotice.startsWith('Failed') ? '#DC2626' : '#16A34A' }}>
          {postNotice}
        </p>
      )}
    </div>
  )

  const renderFeedSection = () => (
    <div
      className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6"
      style={{ border: '1px solid #E8E8E8' }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold" style={{ color: '#212529' }}>
          Group Feed
        </h2>
        <span className="text-sm" style={{ color: '#5F6368' }}>
          {group.posts} posts
        </span>
      </div>

      {feedLoading ? (
        <p className="text-sm" style={{ color: '#5F6368' }}>Loading feed...</p>
      ) : groupFeed.length === 0 ? (
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: '#E8E8E8', backgroundColor: '#F8F9FA', color: '#5F6368' }}>
          No posts in this group yet.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {groupFeed.map((post) => (
              <FeedPost
                key={post.id}
                id={post.id}
                authorId={post.author.id}
                author={post.author}
                content={post.content}
                image={post.image}
                video={post.video}
                timestamp={String(post.timestamp)}
                likes={post.likes}
                dislikes={post.dislikes}
                comments={post.comments}
                sends={post.sends}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  const nextPage = page + 1
                  setPage(nextPage)
                  fetchGroupFeed(nextPage, true)
                }}
                disabled={loadingMore}
                className="px-5 py-2 rounded-lg border"
                style={{
                  borderColor: '#212529',
                  color: '#212529',
                }}
              >
                {loadingMore
                  ? 'Loading...'
                  : 'Load More Posts'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderAboutColumn = () => (
    <div className="space-y-6">
      <div
        className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8"
        style={{ border: '1px solid #E8E8E8' }}
      >
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#212529' }}>
          About
        </h2>
        <p style={{ color: '#5F6368', lineHeight: '1.8' }}>
          {group.about}
        </p>
      </div>

      {group.membersList.length > 0 && (
        <div
          className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8"
          style={{ border: '1px solid #E8E8E8' }}
        >
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#212529' }}>
            Members
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {group.membersList.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                style={{ backgroundColor: '#F8F9FA' }}
                onClick={() => member.id && router.push(profileHref(member.id, member.name))}
              >
                <img
                  src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=E8E8E8&color=212529&size=48`}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="font-medium truncate hover:underline" style={{ color: '#212529' }}>
                    {member.name}
                  </p>
                  <p className="text-sm" style={{ color: '#5F6368' }}>
                    {member.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 flex flex-col gap-3"
        style={{ border: '1px solid #E8E8E8' }}
      >
        <button
          onClick={handleOpenGroupMessage}
          disabled={openingChat}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full disabled:opacity-60"
          style={{ backgroundColor: '#F8F9FA', color: '#212529' }}
        >
          <MessageCircle className="w-5 h-5" />
          {openingChat ? 'Opening...' : 'Message'}
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full"
          style={{ backgroundColor: '#F8F9FA', color: '#212529' }}
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>
        {group.type === 'private' && isGroupOwner && (
          <button
            onClick={handleOpenRequestsModal}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full transition-colors"
            style={{ backgroundColor: '#212529', color: '#FFFFFF' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3D3D3D')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#212529')}
          >
            <ClipboardList className="w-5 h-5" />
            Manage Requests
          </button>
        )}
        {isGroupOwner && (
          <button
            onClick={handleGenerateInvite}
            disabled={inviteLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full disabled:opacity-60"
            style={{ backgroundColor: '#F8F9FA', color: '#212529' }}
          >
            {inviteLoading ? 'Generating Invite...' : 'Generate Invite Link'}
          </button>
        )}
        {inviteMessage && (
          <p className="text-xs text-center" style={{ color: inviteMessage.startsWith('Failed') ? '#DC2626' : '#5F6368' }}>
            {inviteMessage}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="p-3 sm:p-6 overflow-y-auto" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        {/* <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#212529' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E8E8E8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to groups
        </button> */}

        {/* Group Card with Header */}
        <div
          className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8"
          style={{ border: '1px solid #E8E8E8' }}
        >
          {/* Hero Image */}
          <img src={group.image || `https://ui-avatars.com/api/name=${encodeURIComponent(group.name || 'Group')}`} alt={group.name} className="w-full h-72 object-cover" />

          {/* Group Info */}
          <div className="p-4 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#212529' }}>
                    {group.name}
                  </h1>
                  <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: '#F8F9FA', color: '#5F6368' }}>
                    {group.type === 'public' ? <Globe className="w-4 h-4 inline" /> : <Lock className="w-4 h-4 inline" />}
                    {' '}{group.type === 'public' ? 'Public' : 'Private'}
                  </span>
                </div>
                <p style={{ color: '#5F6368' }}>{group.description}</p>
              </div>

              <button
                onClick={handleJoin}
                disabled={requestPending && !isJoined}
                className={`px-6 py-2 rounded-lg font-medium border transition-all whitespace-nowrap active:scale-95 ${requestPending && !isJoined ? 'cursor-not-allowed opacity-70' : ''}`}
                style={{
                  backgroundColor: 'transparent',
                  color: isJoined ? '#DC2626' : requestPending ? '#5F6368' : '#212529',
                  borderColor: isJoined ? '#DC2626' : requestPending ? '#9CA3AF' : '#212529',
                }}
                onMouseEnter={(e) => {
                  if (isJoined) {
                    e.currentTarget.style.backgroundColor = '#DC2626'
                    e.currentTarget.style.color = '#FFFFFF'
                  } else if (!requestPending) {
                    e.currentTarget.style.backgroundColor = '#212529'
                    e.currentTarget.style.color = '#FFFFFF'
                  }
                }}
                onMouseLeave={(e) => {
                  if (isJoined) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#DC2626'
                  } else if (!requestPending) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#212529'
                  }
                }}
              >
                {isJoined ? 'Leave Group' : requestPending ? 'Requested' : group.type === 'private' ? 'Request to Join' : 'Join Group'}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-b" style={{ borderColor: '#E8E8E8' }}>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#212529' }}>
                  {group.members.toLocaleString()}
                </p>
                <p className="text-sm" style={{ color: '#5F6368' }}>
                  Members
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#212529' }}>
                  {group.posts.toLocaleString()}
                </p>
                <p className="text-sm" style={{ color: '#5F6368' }}>
                  Posts
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#212529' }}>
                  {adminCount}
                </p>
                <p className="text-sm" style={{ color: '#5F6368' }}>
                  Admins
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#212529' }}>
                  {group.category}
                </p>
                <p className="text-sm" style={{ color: '#5F6368' }}>
                  Category
                </p>
              </div>
            </div>

            <div className="mt-6 lg:hidden">
              <div className="bg-[#F8F9FA] rounded-2xl p-2 flex gap-2 border" style={{ borderColor: '#E8E8E8' }}>
                <button
                  onClick={() => setFeedTab('feed')}
                  className={`flex-1 rounded-xl px-4 py-3 font-medium text-sm transition ${feedTab === 'feed' ? 'bg-black text-white' : 'text-gray-500'}`}
                >
                  Feed
                </button>
                <button
                  onClick={() => setFeedTab('about')}
                  className={`flex-1 rounded-xl px-4 py-3 font-medium text-sm transition ${feedTab === 'about' ? 'bg-black text-white' : 'text-gray-500'}`}
                >
                  About
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] gap-8 items-start">
          <div className="space-y-6">
            {renderCreatePostSection()}
            {renderFeedSection()}
          </div>
          {renderAboutColumn()}
        </div>

        <div className="space-y-6 lg:hidden">
          {feedTab === 'feed' ? (
            <>
              {renderCreatePostSection()}
              {renderFeedSection()}
            </>
          ) : (
            renderAboutColumn()
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={group.description}
        title={group.name}
        contentType="groups"
        contentId={group.id}
      />

      {showRequestsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border max-h-[85vh] flex flex-col" style={{ border: '1px solid #E8E8E8' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#E8E8E8' }}>
              <div>
                <h3 className="text-xl font-semibold" style={{ color: '#212529' }}>Manage Join Requests</h3>
                <p className="text-sm" style={{ color: '#5F6368' }}>{requests.length} pending</p>
              </div>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {requestsLoading && (
                <p className="text-sm" style={{ color: '#5F6368' }}>Loading requests...</p>
              )}

              {!requestsLoading && requestsError && (
                <div className="text-sm rounded-lg border p-3" style={{ borderColor: '#FCA5A5', color: '#B91C1C', backgroundColor: '#FEF2F2' }}>
                  {requestsError}
                </div>
              )}

              {!requestsLoading && !requestsError && requests.length === 0 && (
                <div className="text-sm rounded-lg border p-4" style={{ borderColor: '#E8E8E8', color: '#5F6368', backgroundColor: '#F8F9FA' }}>
                  No pending requests.
                </div>
              )}

              {!requestsLoading && !requestsError && requests.map((req) => {
                const fullName = req.user?.full_name || req.user?.username || 'Unknown User'
                const profession = req.user?.profession || 'Professional'
                const location = req.user?.location || 'N/A'
                const avatar =
                  req.user?.profile_photo ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=E8E8E8&color=212529&size=96`

                const isApproving = requestAction?.id === req.id && requestAction?.type === 'approve'
                const isRejecting = requestAction?.id === req.id && requestAction?.type === 'reject'

                return (
                  <div
                    key={req.id}
                    onClick={() => {
                      const userId = req.user?.id || req.userId
                      if (userId) {
                        setShowRequestsModal(false)
                        router.push(profileHref(userId, fullName))
                      }
                    }}
                    className="w-full text-left rounded-xl border p-4 transition hover:shadow-sm cursor-pointer"
                    style={{ borderColor: '#E8E8E8', backgroundColor: '#FFFFFF' }}
                  >
                    <div className="flex items-center gap-3">
                      <img src={avatar} alt={fullName} className="w-12 h-12 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate" style={{ color: '#212529' }}>{fullName}</p>
                        <p className="text-sm truncate" style={{ color: '#5F6368' }}>{profession}</p>
                        <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#5F6368' }}>
                          <MapPin className="w-3 h-3" /> {location}
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRejectFromModal(req.id)}
                          disabled={isApproving || isRejecting}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-60"
                          style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: 'transparent' }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <X className="w-3.5 h-3.5" />
                            {isRejecting ? 'Rejecting...' : 'Reject'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleApproveFromModal(req.id)}
                          disabled={isApproving || isRejecting}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border disabled:opacity-60"
                          style={{ borderColor: '#212529', color: '#212529', backgroundColor: 'transparent' }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            {isApproving ? 'Approving...' : 'Approve'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
