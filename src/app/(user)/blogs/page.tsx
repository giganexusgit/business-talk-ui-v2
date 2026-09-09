'use client'

import { Search, Clock, Eye, Send, Trash2, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import ExpandableText from '@/components/common/ExpandableText'
import apiClient, { extractPaginatedData } from '@/lib/api-client'
import { useRouter, useSearchParams } from 'next/navigation'
import { profileHref } from '@/lib/profile-link'
import { ShareModal } from '@/components/shared/ShareModal'
import { useAppSelector } from '@/hooks/useRedux'
import { HashtagList } from '@/lib/hashtag'

interface Author {
  name: string
  avatar: string
  title: string
}

interface Blog {
  id: string
  authorId: string
  title: string
  excerpt: string
  author: Author
  image: string
  category: string
  readTime: string
  publishedAt: string
  views: number
  bookmarks: number
}

const PRESET_TAGS = ['All', 'Technology', 'Entrepreneurship', 'Marketing', 'Leadership', 'Finance']

export default function BlogsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduxUser = useAppSelector((state: any) => state.auth.user)
  
  const initialTag = searchParams?.get('tag') || searchParams?.get('category') || 'All'
  const initialSearch = searchParams?.get('search') || searchParams?.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialTag)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data,
    isLoading: loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['blogs-feed', selectedCategory, searchQuery],

    initialPageParam: 1,

    queryFn: async ({ pageParam }) => {
      const tagParam = selectedCategory !== 'All' ? selectedCategory : undefined
      const searchParam = searchQuery.trim() ? searchQuery.trim() : undefined
      const res = await apiClient.getBlogs(
        pageParam,
        50,
        tagParam,
        searchParam
      )

      const {
        data,
        hasMore,
      } = extractPaginatedData(res)

      const formatted = data.map(
        (b: any) => ({
          id: b.id,
          authorId:
            b.user?.id ||
            b.author?.id ||
            '',

          title: b.title,

          excerpt:
            (() => {
              const plain = b.content ? b.content.replace(/<[^>]*>/g, '').trim() : ''
              return b.excerpt || (plain.length > 150 ? plain.slice(0, 150) + '...' : plain)
            })(),

          author: {
            name:
              b.user?.username ||
              b.author?.name ||
              'Unknown',

            avatar:
              b.user
                ?.profile_photo ||
              b.author
                ?.avatar ||
              '/avatar.png',

            title:
              b.user
                ?.profession ||
              b.author
                ?.title ||
              'User',
          },

          image:
            b.cover_image ||
            '/placeholder.jpg',

          category:
            (
              b.tags || []
            ).map(
              (t: any) =>
                typeof t === 'string' ? t : t.name
            ),

          readTime:
            '5 min read',

          publishedAt:
            new Date(
              Number(
                b.created_on
              )
            ).toDateString(),

          views:
            b.views || 0,

          bookmarks: 0,
        })
      )

      return {
        data: formatted,
        hasMore,
        nextPage:
          pageParam + 1,
      }
    },

    getNextPageParam:
      lastPage =>
        lastPage.hasMore
          ? lastPage.nextPage
          : undefined,
  })

  const blogs =
    data?.pages.flatMap(
      page => page.data
    ) || []

  // Extract all dynamic tags from fetched blogs
  const extractedTags = Array.from(
    new Set(
      blogs.flatMap((b) => (Array.isArray(b.category) ? b.category : [b.category])).filter(Boolean)
    )
  )
  const categories = ['All', ...Array.from(new Set([...PRESET_TAGS.slice(1), ...extractedTags]))]

  // Filter blogs by search query and selected tag
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = !searchQuery.trim() ||
      (blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       blog.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       blog.author?.name?.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : Array.isArray(blog.category)
        ? blog.category.some((cat: string) =>
            cat.toLowerCase().includes(selectedCategory.toLowerCase())
          )
        : String(blog.category || '').toLowerCase().includes(selectedCategory.toLowerCase())

    return matchesSearch && matchesCategory
  })

  const showDeleteToast = (message: string, type: 'success' | 'error') => {
    setDeleteToast({ message, type })
    setTimeout(() => setDeleteToast(null), 3000)
  }

  useEffect(() => {
    if (reduxUser?.id) {
      setCurrentUserId(String(reduxUser.id))
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        setCurrentUserId(String(u.id || ''))
      } catch {}
    }
  }, [reduxUser])

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        entries => {
          if (
            entries[0]
              ?.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            fetchNextPage()
          }
        },
        {
          threshold: 0.5,
        }
      )

    if (loadMoreRef.current) {
      observer.observe(
        loadMoreRef.current
      )
    }

    return () =>
      observer.disconnect()
  }, [
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ])

  if (loading) {
    return <div className="p-6">Loading blogs...</div>
  }

  const handleBlogClick = (blog: Blog) => {
    router.push(`/blogs/${blog.id}`)
  }

  const handleDeleteBlog = async (blogId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this blog? This cannot be undone.')) return
    try {
      await apiClient.deleteBlog(blogId)
      // setBlogs(prev => prev.filter(b => b.id !== blogId))
      showDeleteToast(
        'Blog deleted successfully',
        'success'
      )

      window.location.reload()
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 403) {
        showDeleteToast('You can only delete your own content', 'error')
      } else if (status === 401) {
        showDeleteToast('Session expired. Please log in again.', 'error')
      } else {
        showDeleteToast(err?.response?.data?.message || 'Failed to delete blog', 'error')
      }
    }
  }

  return (
    <>
    {/* Delete toast */}
    {deleteToast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl ${
        deleteToast.type === 'success' ? 'bg-gray-900' : 'bg-red-600'
      }`}>
        {deleteToast.message}
      </div>
    )}
    <div className="p-6 overflow-y-auto" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: '#212529' }}>
            Business Insights
          </h1>
          <p style={{ color: '#5F6368' }}>Read expert articles and insights from industry leaders</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6" style={{ border: '1px solid #E8E8E8' }}>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#5F6368' }} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E8E8E8',
                color: '#212529',
              }}
              onFocus={(e) => (e.currentTarget.style.outlineColor = '#212529')}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: selectedCategory === category ? '#212529' : '#F8F9FA',
                  color: selectedCategory === category ? '#FFFFFF' : '#5F6368',
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.backgroundColor = '#E8E8E8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.backgroundColor = '#F8F9FA'
                  }
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>


        {/* Featured Article or Empty State */}
        {filteredBlogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">No Blogs Available</h2>
            <p className="mb-2">Looks like we currently don't have blogs available.</p>
            <p className="mb-6">Hang on tight, blogs will be added soon!</p>
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6 hover:shadow-md transition-shadow cursor-pointer"
            style={{ border: '1px solid #E8E8E8' }}
            // onClick={() => filteredBlogs[0] && handleBlogClick(filteredBlogs[0])}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <img src={filteredBlogs[0]?.image} alt={filteredBlogs[0]?.title} className="w-full h-full object-cover" onClick={() => filteredBlogs[0] && handleBlogClick(filteredBlogs[0])}/>
              <div className="p-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}>
                    Featured
                  </span>
                </div>
                <h2 className="text-2xl font-semibold mb-3 whitespace-pre-wrap break-words" style={{ color: '#212529' }} onClick={() => filteredBlogs[0] && handleBlogClick(filteredBlogs[0])}>
                  {filteredBlogs[0]?.title}
                </h2>
                <ExpandableText className="mb-3 text-sm whitespace-pre-wrap break-words" lines={4} onClick={() => filteredBlogs[0] && handleBlogClick(filteredBlogs[0])}>
                  {filteredBlogs[0]?.excerpt}
                </ExpandableText>
                <div className="mb-4">
                  <HashtagList tags={filteredBlogs[0]?.category} badgeStyle />
                </div>
                <div
                  className="flex items-center gap-3 mb-4 cursor-pointer"
                  onClick={e => { e.stopPropagation(); filteredBlogs[0]?.authorId && router.push(profileHref(filteredBlogs[0].authorId, filteredBlogs[0]?.author?.name)) }}
                >
                  <img
                    src={filteredBlogs[0]?.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(filteredBlogs[0]?.author?.name || 'User')}&background=E8E8E8&color=212529&size=40`}
                    alt={filteredBlogs[0]?.author?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium hover:underline" style={{ color: '#212529' }} onClick={() => filteredBlogs[0]?.authorId && router.push(profileHref(filteredBlogs[0].authorId, filteredBlogs[0]?.author?.name))}>
                      {filteredBlogs[0]?.author?.name}
                    </p>
                    <p className="text-sm" style={{ color: '#5F6368' }}>
                      {filteredBlogs[0]?.author?.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm" style={{ color: '#5F6368' }}>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {filteredBlogs[0]?.readTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {filteredBlogs[0]?.views.toLocaleString()} views
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedBlog(filteredBlogs[0])
                        setShowShareModal(true)
                      }}
                      className="p-2 rounded-lg transition-colors cursor-pointer"
                      style={{ color: '#5F6368' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                    {currentUserId && currentUserId === String(filteredBlogs[0]?.authorId) && (
                      <button
                        onClick={(e) => filteredBlogs[0] && handleDeleteBlog(filteredBlogs[0].id, e)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors ml-2"
                        title="Delete blog"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs">Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        <div className="space-y-6">
          {filteredBlogs.slice(1).map((blog) => (
            <div
              key={blog.id}
              className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer"
              style={{ border: '1px solid #E8E8E8' }}
              // onClick={() => handleBlogClick(blog)}
            >
              <div className="grid md:grid-cols-3 gap-6">
                <img src={blog.image} alt={blog.title} className="w-full h-48 object-cover rounded-xl" onClick={() => handleBlogClick(blog)} />
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-gray-500">
                      {blog.publishedAt}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 whitespace-pre-wrap break-words" style={{ color: '#212529' }} onClick={() => handleBlogClick(blog)}>
                    {blog.title}
                  </h3>
                  <ExpandableText className="mb-3 text-sm whitespace-pre-wrap break-words" lines={4} onClick={() => handleBlogClick(blog)}>
                    {blog.excerpt}
                  </ExpandableText>
                  <div className="mb-4">
                    <HashtagList tags={blog.category} badgeStyle />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={e => { e.stopPropagation(); blog.authorId && router.push(profileHref(blog.authorId, blog.author?.name)) }}
                    >
                      <img src={blog.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author.name)}&background=E8E8E8&color=212529&size=32`} alt={blog.author.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="font-medium text-sm hover:underline" style={{ color: '#212529' }} onClick={() => blog.authorId && router.push(profileHref(blog.authorId, blog.author?.name))}>
                          {blog.author.name}
                        </p>
                        <p className="text-xs" style={{ color: '#5F6368' }}>
                          {blog.author.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-4 text-sm" style={{ color: '#5F6368' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {blog.readTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {blog.views.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {/* <button
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#5F6368' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <BookmarkPlus className="w-5 h-5" />
                        </button> */}
                        <button
                          onClick={() => {
                            setSelectedBlog(blog)
                            setShowShareModal(true)
                          }}
                          className="p-2 rounded-lg transition-colors cursor-pointer"
                          style={{ color: '#5F6368' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Send className="w-5 h-5" />
                        </button>
                        {currentUserId && currentUserId === String(blog.authorId) && (
                          <button
                            onClick={(e) => handleDeleteBlog(blog.id, e)}
                            className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete blog"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div
            ref={loadMoreRef}
            className="py-8 flex justify-center"
          >
            {isFetchingNextPage && (
              <Loader2 className="w-6 h-6 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        postContent={selectedBlog?.excerpt}
        title={selectedBlog?.title}
        contentType="blogs"
        contentId={selectedBlog?.id}
      />
    </div>
    </>
  )
}
