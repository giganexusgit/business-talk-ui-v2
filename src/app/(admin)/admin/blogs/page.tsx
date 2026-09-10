 'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/shared/Button'
// import { useRouter } from 'next/navigation'
import { AdminCreateBlogBox } from '@/components/admin/AdminCreateBlogBox'
import { useAdminBlogs, useDeleteBlog, useUpdateBlog } from '@/hooks/useAdminBlogs'
// import { useDeletePost } from '@/hooks/useAdminPosts'
// import { useBanUser, useWarnUser } from '@/hooks/useAdminPosts'
import { AdminContentCard } from '@/components/admin/AdminContentCard'
import { validateImageFile } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'
import apiClient from '@/lib/api-client'
import BasicEditor from '@/components/editor/BasicEditor'

const filters = ['All', 'Latest', 'Trending', 'Reported']

export default function AdminBlogsPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50
  const [allBlogs, setAllBlogs] = useState<any[]>([])
  // const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams?.get('q') || ''

  useEffect(() => {
    if (!qParam) {
      setSearchResults(null)
      return
    }

    const run = async () => {
      try {
        const res = await apiClient.searchAll(qParam, 'blogs', 1, 50)
        const raw = res?.data ?? {}

        const extract = (obj: any) => {
          if (!obj) return []
          if (Array.isArray(obj)) return obj
          const keys = ['items', 'posts', 'questions', 'blogs', 'stories', 'users']
          let out: any[] = []
          for (const k of keys) {
            const arr = obj[k]
            if (Array.isArray(arr)) out = out.concat(arr)
          }
          return out
        }

        let items: any[] = []
        if (Array.isArray(raw)) items = raw
        else if (raw.data && Array.isArray(raw.data)) items = raw.data
        else if (raw.data && typeof raw.data === 'object') items = extract(raw.data)
        else items = extract(raw)

        const filtered = (items || []).filter((i: any) => {
          const t = String(i.type || '').toUpperCase()
          return t === 'BLOG' || t === 'ADMIN_BLOG' || t === 'STORY'
        })

        if ((filtered || []).length > 0) {
          setSearchResults(filtered)
        } else {
          // fallback: if qParam looks like an id, try fetching blog/story by id
          const looksLikeId = /^[0-9a-fA-F-]{6,}$/.test(qParam) || /^\d+$/.test(qParam)
          if (looksLikeId) {
            try {
              const single = await apiClient.getBlogById(qParam)
              const blog = single?.data
              if (blog && (String(blog.type || '').toUpperCase() === 'BLOG' || String(blog.type || '').toUpperCase() === 'STORY' || String(blog.type || '').toUpperCase() === 'ADMIN_BLOG')) {
                setSearchResults([blog])
                return
              }
            } catch (e) {
              // ignore
            }
          }

          setSearchResults([])
        }
      } catch (err) {
        setSearchResults([])
      }
    }

    run()
  }, [qParam])

  // // Debounced input -> call search API for blogs/stories
  // useEffect(() => {
  //   if (debounceRef.current) clearTimeout(debounceRef.current)
  //   if (!debouncedSearch) {
  //     if (!qParam) setSearchResults(null)
  //     return
  //   }

  //   debounceRef.current = setTimeout(async () => {
  //     try {
  //       const res = await apiClient.searchAll(debouncedSearch, 'blogs', 1, 50)
  //       const raw = res?.data ?? {}
  //       let items: any[] = []
  //       if (Array.isArray(raw)) items = raw
  //       else if (raw && typeof raw === 'object') {
  //         const keys = ['items', 'posts', 'questions', 'blogs', 'stories', 'users']
  //         for (const k of keys) {
  //           const arr = raw[k]
  //           if (Array.isArray(arr)) items = items.concat(arr)
  //         }
  //       }
  //       const filtered = (items || []).filter((i: any) => {
  //         const t = String(i.type || '').toUpperCase()
  //         return t === 'BLOG' || t === 'ADMIN_BLOG' || t === 'STORY'
  //       })
  //       setSearchResults(filtered)
  //     } catch (err) {
  //       setSearchResults([])
  //     }
  //   }, 300)

  //   return () => {
  //     if (debounceRef.current) clearTimeout(debounceRef.current)
  //   }
  // }, [debouncedSearch, qParam])

  // simple client-side suggestions removed — using local debounced search like posts/users
  const [editingBlog, setEditingBlog] = useState<any | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editCoverUrl, setEditCoverUrl] = useState('')
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editError, setEditError] = useState('')

  const { data: blogs = [], isLoading } =
    useAdminBlogs(
      activeFilter,
      page,
      limit
    )

  useEffect(() => {
    if (!blogs?.length) return

    setAllBlogs(prev => {
      const existingIds = new Set(prev.map((item: any) =>item.id))

      const newBlogs = blogs.filter(
        (item: any) =>!existingIds.has(item.id)
      )

      return [...prev, ...newBlogs]
    })
  }, [blogs])

  useEffect(() => {
    setPage(1)
    setAllBlogs([])
  }, [activeFilter])

  const deleteBlog = useDeleteBlog()
  const updateBlog = useUpdateBlog()
  // const warnUser = useWarnUser()
  // const banUser = useBanUser()

  const openEditModal = (blog: any) => {
    setEditingBlog(blog)
    setEditTitle(blog?.title || '')
    setEditContent(blog?.content || '')
    setEditTags(
      Array.isArray(blog?.tags)
        ? blog.tags
            .map((t: any) => (typeof t === 'string' ? t : t?.name))
            .filter(Boolean)
            .join(', ')
        : ''
    )
    setEditCoverUrl(blog?.cover_image || '')
    setEditCoverFile(null)
    setEditError('')
  }

  const closeEditModal = () => {
    setEditingBlog(null)
    setEditTitle('')
    setEditContent('')
    setEditTags('')
    setEditCoverUrl('')
    setEditCoverFile(null)
    setEditError('')
  }
  // const deletePost = useDeletePost()
  const itemsToRender =
  searchResults !== null
    ? searchResults
    : allBlogs

  // const resolveCardType = (it: any) => {
  //   const t = String(it?.type || it?.post_type || '').toUpperCase()
  //   if (t === 'QUESTION') return 'question'
  //   if (t === 'BLOG' || t === 'ADMIN_BLOG') return 'blog'
  //   if (t === 'STORY') return 'story'
  //   return 'post'
  // }

  // const renderCard = (b: any) => {
  //   const cardType = resolveCardType(b) as any
  //   const author = {
  //     id: b.user?.id || '',
  //     name: b.user?.full_name || b.user?.username || 'Unknown',
  //     avatar: b.user?.profile_photo,
  //     title: b.user?.profession,
  //   }

  //   const common = {
  //     key: b.id,
  //     id: b.id,
  //     author,
  //     likes: b.upvotes ?? b.likes ?? 0,
  //     commentsCount: b.commentsCount ?? b.comments_count ?? b.comment_count ?? 0,
  //     views: b.views,
  //     createdOn: b.created_on,
  //   }

  //   if (cardType === 'blog' || cardType === 'story') {
  //     return (
  //       <AdminContentCard
  //         {...common}
  //         type={cardType}
  //         title={b.title}
  //         content={b.content}
  //         coverImage={b.cover_image}
  //         media={b.media || []}
  //         tags={b.tags || []}
  //         onDelete={(id) => deleteBlog.mutate(id)}
  //         onEdit={b.type === 'ADMIN_BLOG' ? () => openEditModal(b) : undefined}
  //       />
  //     )
  //   }

  //   if (cardType === 'question') {
  //     return (
  //       <AdminContentCard
  //         {...common}
  //         type="question"
  //         title={b.content}
  //         content={b.description}
  //         tags={b.tags || []}
  //         onDelete={(id) => deleteBlog.mutate(id)}
  //       />
  //     )
  //   }

  //   // default: post
  //   return (
  //     <AdminContentCard
  //       {...common}
  //       type="post"
  //       content={b.content}
  //       media={b.media || []}
  //       tags={b.tags || []}
  //       onDelete={(id) => deletePost.mutate(id)}
  //     />
  //   )
  // }

  const handleUpdateBlog = async () => {
    if (!editingBlog?.id) return

    const title = editTitle.trim()
    const content = editContent.trim()
    const tags = editTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (!title && !content && !editCoverFile && !editCoverUrl.trim() && tags.length === 0) {
      setEditError('Please update at least one field before saving.')
      return
    }

    try {
      setEditError('')

      if (editCoverFile) {
        const formData = new FormData()
        if (title) formData.append('title', title)
        if (content) formData.append('content', content)
        if (tags.length > 0) formData.append('tags', JSON.stringify(tags))
        formData.append('cover_image', editCoverFile)

        await updateBlog.mutateAsync({ id: editingBlog.id, payload: formData })
      } else {
        const payload: Record<string, unknown> = {}
        if (title) payload.title = title
        if (content) payload.content = content
        if (tags.length > 0) payload.tags = tags
        if (editCoverUrl.trim()) payload.cover_image = editCoverUrl.trim()

        await updateBlog.mutateAsync({ id: editingBlog.id, payload })
      }

      closeEditModal()
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to update blog.'
      setEditError(message)
    }
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#212529' }}>Blogs Management</h1>
          <Button onClick={() => setShowCreate(true)}>Create Blog</Button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeFilter === f ? '#212529' : '#fff',
                color: activeFilter === f ? '#fff' : '#5F6368',
                border: '1px solid #E8E8E8',
              }}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto relative flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => setDebouncedSearch(e.target.value), 300)
              }}
              placeholder="Search blogs, authors..."
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : itemsToRender.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No blogs found.</div>
        ) : (
          itemsToRender
            .filter((b: any) => {
              if (!debouncedSearch) return true
              const q = debouncedSearch.toLowerCase()
              const author = (b.user?.full_name || b.user?.username || '').toLowerCase()
              const content = (b.content || b.title || '').toLowerCase()
              const title = (b.title || '').toLowerCase()
              return author.includes(q) || content.includes(q) || title.includes(q)
            })
            .map((b: any) => (
            <AdminContentCard
              key={b.id}
              id={b.id}
              type="blog"
              author={{
                id: b.user?.id || '',
                name: b.user?.full_name || b.user?.username || 'Unknown',
                avatar: b.user?.profile_photo,
                title: b.user?.profession,
              }}
              title={b.title}
              content={b.content}
              coverImage={b.cover_image}
              media={b.media || []}
              tags={b.tags || []}
              likes={b.upvotes ?? b.likes ?? 0}
              commentsCount={b.commentsCount ?? b.comments_count ?? b.comment_count ?? 0}
              views={b.views}
              createdOn={b.created_on}
              // onWarn={(uid) => warnUser.mutate(uid)}
              // onBan={(uid) => banUser.mutate(uid)}
              onDelete={(id) => deleteBlog.mutate(id)}
              onEdit={b.type === 'ADMIN_BLOG' ? () => openEditModal(b) : undefined}
            />
          ))
        )}
        {blogs.length >= limit && searchResults === null && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={() => setPage(prev => prev + 1)}
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {showCreate && (
        <div
          className="
            fixed
            inset-0
            bg-black/50
            z-50
            overflow-y-auto
            p-2
            sm:p-4
          "
        >
          <div className="min-h-full flex items-center justify-center">
            <div
              className="
                w-full
                max-w-2xl
                max-h-[90vh]
                overflow-y-auto
              "
            >
              <AdminCreateBlogBox onCreated={() => setShowCreate(false)} />
              <div className="text-center mt-4">
                <Button onClick={() => setShowCreate(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingBlog && (
        <div
          className="
            fixed
            inset-0
            bg-black/50
            z-50
            overflow-y-auto
            p-2
            sm:p-4
          "
        >
          <div className="min-h-full flex items-center justify-center">
            <div
              className="
                w-full
                max-w-2xl
                bg-white
                rounded-2xl
                border
                p-4
                sm:p-6
                max-h-[90vh]
                overflow-y-auto
              "
              style={{ borderColor: '#E8E8E8' }}
            >
              <h2 className="text-xl font-semibold mb-4" style={{ color: '#212529' }}>
                Edit Admin Blog
              </h2>

              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Blog title"
                  className="w-full p-3 bg-gray-50 border rounded-xl"
                />

                <BasicEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Blog content"
                  className="
                    w-full
                    bg-gray-50
                    border
                    rounded-xl
                    max-h-[50vh]
                    overflow-hidden
                  "
                />

                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="w-full p-3 bg-gray-50 border rounded-xl"
                />

                <input
                  value={editCoverUrl}
                  onChange={(e) => setEditCoverUrl(e.target.value)}
                  placeholder="Cover image URL (optional)"
                  className="w-full p-3 bg-gray-50 border rounded-xl"
                />

                {editCoverFile && (
                  <div className="mt-3">
                    <img
                      src={URL.createObjectURL(editCoverFile)}
                      alt="Preview"
                      className="
                        w-full
                        max-h-56
                        object-cover
                        rounded-xl
                        border
                      "
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium" style={{ color: '#5F6368' }}>
                    Upload new cover image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (file) {
                        const err = validateImageFile(file)
                        if (err) { alert(err); return }
                      }
                      setEditCoverFile(file)
                    }}
                    className="mt-1 w-full p-2 border rounded-xl bg-white"
                  />
                </div>

                {editError && (
                  <p className="text-sm" style={{ color: '#DC2626' }}>{editError}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
                <Button
                  onClick={closeEditModal}
                  className="w-full sm:w-auto"
                >Cancel</Button>
                <Button
                  onClick={handleUpdateBlog}
                  disabled={updateBlog.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateBlog.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}