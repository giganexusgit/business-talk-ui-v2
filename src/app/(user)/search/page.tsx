'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Users,
  FileText,
  FileQuestion,
  BookOpen,
  ImageIcon,
  UsersRound,
  Loader2,
  X,
  UserCheck,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import apiClient from '@/lib/api-client'
import { profileHref } from '@/lib/profile-link'
import { useRequireAuth } from '@/hooks/useRequireAuth'

type TabType = 'all' | 'people' | 'posts' | 'stories' | 'qa' | 'blogs' | 'groups'

interface SearchUser {
  id: string
  full_name: string
  username: string
  profession?: string
  profile_photo?: string
  is_following?: boolean
  connection_status?: string
}

interface SearchContentItem {
  id: string
  title?: string
  content: string
  type: string
  author?: {
    id?: string
    username?: string
    full_name?: string
    profile_photo?: string
  }
  linkPath: string
  created_at?: string
  cover_image?: string
  raw?: any
}

interface SearchGroup {
  id: string
  name: string
  description?: string
  cover_image?: string
  members_count?: number
  joined?: boolean
}

interface NormalizedResults {
  users: SearchUser[]
  questions: SearchContentItem[]
  posts: SearchContentItem[]
  stories: SearchContentItem[]
  blogs: SearchContentItem[]
  groups: SearchGroup[]
}

function HighlightText({ text, query }: { text?: string; query: string }) {
  if (!text) return null
  if (!query.trim()) return <>{text}</>
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function parseSearchResults(rawResponse: any): NormalizedResults {
  const raw = rawResponse?.data?.data ?? rawResponse?.data ?? rawResponse ?? {}

  const normalizeArray = (key: string) => {
    const val = raw[key]
    if (!val) return []
    if (Array.isArray(val)) return val
    if (val.entities && Array.isArray(val.entities)) return val.entities
    if (val.raw && Array.isArray(val.raw)) return val.raw
    if (val.items && Array.isArray(val.items)) return val.items
    return []
  }

  let rawUsers = normalizeArray('users')
  let rawQuestions = normalizeArray('questions')
  let rawPosts = normalizeArray('posts')
  let rawBlogs = normalizeArray('blogs')
  let rawStories = normalizeArray('stories')
  let rawGroups = normalizeArray('groups')

  // Support flat array response if returned by backend
  const flatArray = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : null)
  if (flatArray) {
    flatArray.forEach((item: any) => {
      const typeStr = String(item.post_type || item.type || item.content_type || item.entityType || '').toLowerCase()
      if (typeStr.includes('user') || typeStr.includes('person')) rawUsers.push(item)
      else if (typeStr.includes('question')) rawQuestions.push(item)
      else if (typeStr.includes('story')) rawStories.push(item)
      else if (typeStr.includes('blog')) rawBlogs.push(item)
      else if (typeStr.includes('group')) rawGroups.push(item)
      else rawPosts.push(item)
    })
  }

  const canonicalizeUser = (u: any): SearchUser => ({
    id: String(u.id || u.user_id || u._id || ''),
    full_name: u.full_name || u.name || u.username || 'User',
    username: u.username || u.handle || '',
    profession: u.profession || u.title || u.bio || u.email || '',
    profile_photo: u.profile_photo || u.avatar,
    is_following: Boolean(u.is_following || u.following),
    connection_status: u.connection_status || u.status,
  })

  const canonicalizeItem = (item: any, defaultType: string): SearchContentItem => {
    const id = String(item.id || item.post_id || item.blog_id || item.story_id || item.question_id || item._id || '')
    const title = item.title || item.post_title || item.blog_title || item.question_title
    const content = item.content || item.post_content || item.body || item.summary || item.excerpt || ''
    const type = String(item.type || item.post_type || defaultType).toLowerCase()

    let author = item.user || item.author || item.creator || null
    if (!author && (item.user_id || item.username || item.user_username)) {
      author = {
        id: item.user_id,
        username: item.user_username || item.username,
        full_name: item.user_full_name || item.full_name || item.name,
        profile_photo: item.user_profile_photo || item.profile_photo || item.avatar,
      }
    }

    let linkPath = `/${defaultType}s/${id}`
    if (type.includes('question') || defaultType === 'question') linkPath = `/questions/${id}`
    else if (type.includes('post') || defaultType === 'post') linkPath = `/posts/${id}`
    else if (type.includes('story') || defaultType === 'story') linkPath = `/stories/${id}`
    else if (type.includes('blog') || defaultType === 'blog') linkPath = `/blogs/${id}`
    else if (type.includes('group') || defaultType === 'group') linkPath = `/groups/${id}`

    return {
      id,
      title,
      content,
      type,
      author,
      linkPath,
      created_at: item.created_at || item.created_on || item.createdAt,
      cover_image: item.cover_image || item.image || item.thumbnail,
      raw: item,
    }
  }

  return {
    users: rawUsers.map(canonicalizeUser),
    questions: rawQuestions.map((q: any) => canonicalizeItem(q, 'question')),
    posts: rawPosts.map((p: any) => canonicalizeItem(p, 'post')),
    stories: rawStories.map((s: any) => canonicalizeItem(s, 'story')),
    blogs: rawBlogs.map((b: any) => canonicalizeItem(b, 'blog')),
    groups: rawGroups.map((g: any) => ({
      id: String(g.id || g.group_id || g._id || ''),
      name: g.name || g.group_name || 'Group',
      description: g.description || g.about || '',
      cover_image: g.cover_image || g.avatar,
      members_count: g.members_count || g.memberCount || 0,
      joined: Boolean(g.joined || g.is_member),
    })),
  }
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requireAuth = useRequireAuth()

  const qParam = searchParams.get('q') || ''
  const [searchInput, setSearchInput] = useState(qParam)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<NormalizedResults>({
    users: [],
    questions: [],
    posts: [],
    stories: [],
    blogs: [],
    groups: [],
  })

  // Keep input in sync with URL query param
  useEffect(() => {
    setSearchInput(qParam)
  }, [qParam])

  // Execute search whenever qParam changes
  const fetchResults = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults({ users: [], questions: [], posts: [], stories: [], blogs: [], groups: [] })
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.searchAll(trimmed)
      const parsed = parseSearchResults(res.data)
      setResults(parsed)
    } catch (err: any) {
      console.error('Search request failed:', err)
      setError('Failed to load search results. Please try again.')
      setResults({ users: [], questions: [], posts: [], stories: [], blogs: [], groups: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResults(qParam)
  }, [qParam, fetchResults])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = searchInput.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/search')
    }
  }

  const handleFollowUser = async (userId: string, isFollowing?: boolean) => {
    if (!requireAuth()) return
    try {
      if (isFollowing) {
        await apiClient.unfollowUserById(userId)
      } else {
        await apiClient.followUserById(userId)
      }
      setResults((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId ? { ...u, is_following: !isFollowing } : u
        ),
      }))
    } catch {
      // silent catch or fallback
    }
  }

  const counts = {
    people: results.users.length,
    qa: results.questions.length,
    posts: results.posts.length,
    stories: results.stories.length,
    blogs: results.blogs.length,
    groups: results.groups.length,
    total:
      results.users.length +
      results.questions.length +
      results.posts.length +
      results.stories.length +
      results.blogs.length +
      results.groups.length,
  }

  const tabs: { key: TabType; label: string; count: number; icon: React.ElementType }[] = [
    { key: 'all', label: 'All', count: counts.total, icon: Sparkles },
    { key: 'people', label: 'People', count: counts.people, icon: Users },
    { key: 'posts', label: 'Posts', count: counts.posts, icon: FileText },
    { key: 'stories', label: 'Stories', count: counts.stories, icon: ImageIcon },
    { key: 'qa', label: 'Q&A', count: counts.qa, icon: FileQuestion },
    { key: 'blogs', label: 'Blogs', count: counts.blogs, icon: BookOpen },
    { key: 'groups', label: 'Groups', count: counts.groups, icon: UsersRound },
  ]

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* 🔍 Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="relative flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for People, Posts, Stories, Q&A, Blogs..."
            className="w-full py-3.5 pl-12 pr-24 bg-transparent outline-none text-base text-gray-900 placeholder-gray-400"
            aria-label="Search query input"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                router.push('/search')
              }}
              className="absolute right-20 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {/* 🏷️ Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {qParam.trim() ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* ⏳ Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Searching for &quot;{qParam}&quot;...</p>
        </div>
      )}

      {/* ❌ Error State */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
          <p className="font-medium mb-2">{error}</p>
          <button
            onClick={() => fetchResults(qParam)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition"
          >
            Retry Search
          </button>
        </div>
      )}

      {/* ❓ Empty Query State */}
      {!loading && !error && !qParam.trim() && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Explore & Search</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Type keywords above to find People, Posts, Stories, Q&A discussions, Blogs, and Groups on BusinessTalk.
          </p>
        </div>
      )}

      {/* 📭 No Results Found State */}
      {!loading && !error && qParam.trim() && counts.total === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No results for &quot;{qParam}&quot;</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm mb-4">
            Try checking for spelling errors or searching with broader keywords.
          </p>
        </div>
      )}

      {/* 📊 Search Results Content */}
      {!loading && !error && qParam.trim() && counts.total > 0 && (
        <div className="space-y-8">
          {/* 👥 PEOPLE */}
          {(activeTab === 'all' || activeTab === 'people') && results.users.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-gray-900 text-lg">People</h3>
                  <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {results.users.length}
                  </span>
                </div>
                {activeTab === 'all' && results.users.length > 4 && (
                  <button
                    onClick={() => setActiveTab('people')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(activeTab === 'all' ? results.users.slice(0, 4) : results.users).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-purple-200 hover:shadow-md transition-all"
                  >
                    <Link href={profileHref(user.id, user.full_name)} className="flex items-center gap-3 min-w-0 flex-1">
                      {user.profile_photo ? (
                        <img
                          src={user.profile_photo}
                          alt={user.full_name}
                          className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {user.full_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate hover:underline">
                          <HighlightText text={user.full_name} query={qParam} />
                        </p>
                        {user.username && (
                          <p className="text-xs text-gray-500 truncate">
                            @<HighlightText text={user.username} query={qParam} />
                          </p>
                        )}
                        {user.profession && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            <HighlightText text={user.profession} query={qParam} />
                          </p>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={() => handleFollowUser(user.id, user.is_following)}
                      className={`ml-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 ${
                        user.is_following
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {user.is_following ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" /> Follow
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ❓ Q&A (QUESTIONS) */}
          {(activeTab === 'all' || activeTab === 'qa') && results.questions.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Q&A Discussions</h3>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {results.questions.length}
                  </span>
                </div>
                {activeTab === 'all' && results.questions.length > 4 && (
                  <button
                    onClick={() => setActiveTab('qa')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(activeTab === 'all' ? results.questions.slice(0, 4) : results.questions).map((q) => (
                  <div
                    key={q.id}
                    onClick={() => router.push(q.linkPath)}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-purple-200 hover:shadow-md transition-all cursor-pointer"
                  >
                    {q.title && (
                      <h4 className="font-bold text-gray-900 text-base mb-1">
                        <HighlightText text={q.title} query={qParam} />
                      </h4>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-3">
                      <HighlightText text={q.content} query={qParam} />
                    </p>
                    {q.author?.username && (
                      <p className="text-xs text-gray-400 mt-2">
                        Asked by <span className="font-medium text-gray-600">@{q.author.username}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 📝 POSTS */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Posts</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {results.posts.length}
                  </span>
                </div>
                {activeTab === 'all' && results.posts.length > 4 && (
                  <button
                    onClick={() => setActiveTab('posts')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(activeTab === 'all' ? results.posts.slice(0, 4) : results.posts).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(p.linkPath)}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                  >
                    {p.title && (
                      <h4 className="font-bold text-gray-900 text-base mb-1">
                        <HighlightText text={p.title} query={qParam} />
                      </h4>
                    )}
                    <p className="text-sm text-gray-700 line-clamp-3">
                      <HighlightText text={p.content} query={qParam} />
                    </p>
                    {p.author?.username && (
                      <p className="text-xs text-gray-400 mt-2">
                        Posted by <span className="font-medium text-gray-600">@{p.author.username}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🖼️ STORIES */}
          {(activeTab === 'all' || activeTab === 'stories') && results.stories.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-pink-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Stories</h3>
                  <span className="bg-pink-100 text-pink-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {results.stories.length}
                  </span>
                </div>
                {activeTab === 'all' && results.stories.length > 4 && (
                  <button
                    onClick={() => setActiveTab('stories')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(activeTab === 'all' ? results.stories.slice(0, 4) : results.stories).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(s.linkPath)}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-pink-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {s.cover_image && (
                        <img
                          src={s.cover_image}
                          alt={s.title || 'Story cover'}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      {s.title && (
                        <h4 className="font-bold text-gray-900 text-base mb-1">
                          <HighlightText text={s.title} query={qParam} />
                        </h4>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        <HighlightText text={s.content} query={qParam} />
                      </p>
                    </div>
                    {s.author?.username && (
                      <p className="text-xs text-gray-400 mt-3">
                        By <span className="font-medium text-gray-600">@{s.author.username}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 📖 BLOGS */}
          {(activeTab === 'all' || activeTab === 'blogs') && results.blogs.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Blogs</h3>
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {results.blogs.length}
                  </span>
                </div>
                {activeTab === 'all' && results.blogs.length > 4 && (
                  <button
                    onClick={() => setActiveTab('blogs')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(activeTab === 'all' ? results.blogs.slice(0, 4) : results.blogs).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => router.push(b.linkPath)}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer flex gap-4"
                  >
                    {b.cover_image && (
                      <img
                        src={b.cover_image}
                        alt={b.title || 'Blog thumbnail'}
                        className="w-24 h-24 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {b.title && (
                        <h4 className="font-bold text-gray-900 text-base mb-1">
                          <HighlightText text={b.title} query={qParam} />
                        </h4>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        <HighlightText text={b.content} query={qParam} />
                      </p>
                      {b.author?.username && (
                        <p className="text-xs text-gray-400 mt-2">
                          Written by <span className="font-medium text-gray-600">@{b.author.username}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🏢 GROUPS */}
          {(activeTab === 'all' || activeTab === 'groups') && results.groups.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-teal-500" />
                  <h3 className="font-bold text-gray-900 text-lg">Groups</h3>
                  <span className="bg-teal-100 text-teal-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {results.groups.length}
                  </span>
                </div>
                {activeTab === 'all' && results.groups.length > 4 && (
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    See all <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(activeTab === 'all' ? results.groups.slice(0, 4) : results.groups).map((g) => (
                  <div
                    key={g.id}
                    onClick={() => router.push(`/groups/${g.id}`)}
                    className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-teal-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                  >
                    <img
                      src={g.cover_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}`}
                      alt={g.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-gray-200"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">
                        <HighlightText text={g.name} query={qParam} />
                      </h4>
                      {g.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          <HighlightText text={g.description} query={qParam} />
                        </p>
                      )}
                      {g.members_count !== undefined && (
                        <p className="text-xs text-teal-600 font-medium mt-1">
                          {g.members_count} member{g.members_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading search page...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
