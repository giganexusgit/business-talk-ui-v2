'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Hash, ArrowLeft, Layers, FileText, Sparkles, HelpCircle, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { normalizeHashtag, HashtagList } from '@/lib/hashtag'
import apiClient from '@/lib/api-client'
import { FeedPost } from '@/components/user/FeedPost'
import { StoryPost } from '@/components/user/StoryPost'
import { QuestionPost } from '@/components/user/QuestionPost'
import ExpandableText from '@/components/common/ExpandableText'

type ContentTab = 'all' | 'posts' | 'stories' | 'blogs' | 'questions'

export default function HashtagDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawTagParam = (params?.tag as string) || ''
  const normalizedTag = useMemo(() => normalizeHashtag(decodeURIComponent(rawTagParam)), [rawTagParam])

  const [activeTab, setActiveTab] = useState<ContentTab>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [posts, setPosts] = useState<any[]>([])
  const [stories, setStories] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])

  useEffect(() => {
    if (!normalizedTag) return

    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [searchRes, tagFeedRes, blogsRes] = await Promise.allSettled([
          apiClient.searchAll(normalizedTag, 'all', 1, 50),
          apiClient.getPostsByTags([normalizedTag]),
          apiClient.getBlogs(1, 50, normalizedTag),
        ])

        if (cancelled) return

        let allPosts: any[] = []
        let allStories: any[] = []
        let allBlogs: any[] = []
        let allQuestions: any[] = []

        if (searchRes.status === 'fulfilled' && searchRes.value?.data) {
          const d = searchRes.value.data
          const raw = d?.data ?? d ?? {}

          const extractArray = (key: string) => {
            const v = raw[key]
            if (!v) return []
            if (Array.isArray(v)) return v
            if (v.entities && Array.isArray(v.entities)) return v.entities
            if (v.raw && Array.isArray(v.raw)) return v.raw
            if (v.items && Array.isArray(v.items)) return v.items
            return []
          }

          allPosts.push(...extractArray('posts'))
          allStories.push(...extractArray('stories'))
          allBlogs.push(...extractArray('blogs'))
          allQuestions.push(...extractArray('questions'))

          const flatItems = Array.isArray(raw) ? raw : (Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : (Array.isArray(d.results) ? d.results : null)))
          if (flatItems) {
            flatItems.forEach((item: any) => {
              const itemType = String(item.post_type || item.type || item.entityType || '').toUpperCase()
              if (itemType === 'STORY') allStories.push(item)
              else if (itemType === 'QUESTION') allQuestions.push(item)
              else if (itemType === 'BLOG') allBlogs.push(item)
              else allPosts.push(item)
            })
          }
        }

        if (tagFeedRes.status === 'fulfilled' && tagFeedRes.value?.data) {
          const resVal = tagFeedRes.value.data
          const feedItems = Array.isArray(resVal)
            ? resVal
            : (Array.isArray(resVal?.data) ? resVal.data : (Array.isArray(resVal?.posts) ? resVal.posts : []))
          if (Array.isArray(feedItems)) {
            feedItems.forEach((item: any) => {
              const type = String(item.post_type || item.type || '').toUpperCase()
              if (type === 'STORY') allStories.push(item)
              else if (type === 'QUESTION') allQuestions.push(item)
              else allPosts.push(item)
            })
          }
        }

        if (blogsRes.status === 'fulfilled' && blogsRes.value?.data) {
          const resVal = blogsRes.value.data
          const blogItems = Array.isArray(resVal)
            ? resVal
            : (Array.isArray(resVal?.data) ? resVal.data : (Array.isArray(resVal?.blogs) ? resVal.blogs : []))
          if (Array.isArray(blogItems)) {
            blogItems.forEach((b: any) => {
              allBlogs.push(b)
            })
          }
        }

        // De-duplicate items by ID
        const uniqueById = (arr: any[]) => {
          const map = new Map()
          arr.forEach((item) => {
            if (item && item.id && !map.has(item.id)) {
              map.set(item.id, item)
            }
          })
          return Array.from(map.values())
        }

        setPosts(uniqueById(allPosts))
        setStories(uniqueById(allStories))
        setBlogs(uniqueById(allBlogs))
        setQuestions(uniqueById(allQuestions))
      } catch (err: any) {
        console.error('Failed to fetch hashtag feed:', err)
        setError('Failed to load hashtag content. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [normalizedTag])

  const totalCount = posts.length + stories.length + blogs.length + questions.length

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        return { posts, stories: [], blogs: [], questions: [] }
      case 'stories':
        return { posts: [], stories, blogs: [], questions: [] }
      case 'blogs':
        return { posts: [], stories: [], blogs, questions: [] }
      case 'questions':
        return { posts: [], stories: [], blogs: [], questions }
      default:
        return { posts, stories, blogs, questions }
    }
  }, [activeTab, posts, stories, blogs, questions])

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Hashtag Header Banner */}
        <div className="bg-white rounded-2xl border p-6 sm:p-8 shadow-sm border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-100 shadow-inner">
                <Hash className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  #{normalizedTag}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Dedicated feed for #{normalizedTag} across BusinessTalk24
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-100">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'posts'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Posts ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'stories'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Stories ({stories.length})
            </button>
            <button
              onClick={() => setActiveTab('blogs')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'blogs'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Blogs ({blogs.length})
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'questions'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Q&A ({questions.length})
            </button>
          </div>
        </div>

        {/* Content Stream */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border p-6 animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/6" />
                  </div>
                </div>
                <div className="h-16 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-red-600 space-y-3">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-black"
            >
              Retry
            </button>
          </div>
        ) : totalCount === 0 || (filteredItems.posts.length === 0 && filteredItems.stories.length === 0 && filteredItems.blogs.length === 0 && filteredItems.questions.length === 0) ? (
          <div className="bg-white rounded-2xl border p-12 text-center space-y-4 border-gray-200 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Hash className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">No content found for #{normalizedTag}</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Be the first professional to share insights, stories, or ask questions using #{normalizedTag}!
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/?compose=1"
                className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Create Post with #{normalizedTag}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Posts */}
            {filteredItems.posts.map((post) => (
              <FeedPost
                key={post.id}
                id={post.id}
                author={{
                  name: post.user?.full_name || post.user?.username || 'User',
                  title: post.user?.profession || 'Professional',
                  avatar: post.user?.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(post.user?.full_name || 'User')}`,
                }}
                authorId={String(post.user?.id || '')}
                timestamp={post.created_on ? new Date(Number(post.created_on)).toLocaleDateString() : 'Recently'}
                content={post.content}
                likes={Number(post.likes || 0)}
                comments={Number(post.comments_count || 0)}
                tags={post.tags}
              />
            ))}

            {/* Stories */}
            {filteredItems.stories.map((story) => (
              <StoryPost
                key={story.id}
                id={story.id}
                author={{
                  name: story.user?.full_name || story.user?.username || 'User',
                  title: story.user?.profession || 'Professional',
                  avatar: story.user?.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(story.user?.full_name || 'User')}`,
                }}
                authorId={String(story.user?.id || '')}
                timestamp={story.created_on || Date.now()}
                storyTitle={story.title}
                excerpt={story.content || story.excerpt || ''}
                coverImage={story.cover_image}
                likes={Number(story.likes || 0)}
                comments={Number(story.comments_count || 0)}
                views={Number(story.views || 0)}
                tags={story.tags}
              />
            ))}

            {/* Questions */}
            {filteredItems.questions.map((q) => (
              <QuestionPost
                key={q.id}
                id={q.id}
                author={{
                  name: q.user?.full_name || q.user?.username || 'User',
                  title: q.user?.profession || 'Professional',
                  avatar: q.user?.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(q.user?.full_name || 'User')}`,
                }}
                authorId={String(q.user?.id || '')}
                timestamp={q.created_on || Date.now()}
                question={q.title || q.content}
                content={q.content}
                description={q.description}
                likes={Number(q.likes || 0)}
                views={Number(q.views || 0)}
                tags={q.tags}
              />
            ))}

            {/* Blogs */}
            {filteredItems.blogs.map((b) => (
              <div
                key={b.id}
                onClick={() => router.push(`/blogs/${b.id}`)}
                className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  {b.cover_image && (
                    <img src={b.cover_image} alt={b.title} className="w-full h-48 object-cover rounded-xl" />
                  )}
                  <div className={b.cover_image ? 'md:col-span-2' : 'md:col-span-3'}>
                    <div className="flex items-center gap-2 mb-3">
                      <HashtagList tags={b.tags || b.category} badgeStyle />
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-900 whitespace-pre-wrap break-words">
                      {b.title}
                    </h2>
                    <ExpandableText className="mb-4 text-sm text-gray-600 whitespace-pre-wrap break-words" lines={3}>
                      {b.content}
                    </ExpandableText>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
