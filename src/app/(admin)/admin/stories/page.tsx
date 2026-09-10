'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/shared/Button'
// import { useRouter } from 'next/navigation'
import { AdminCreateStoryBox } from '@/components/admin/AdminCreateStoryBox'
import { useAdminStories, useDeleteStory } from '@/hooks/useAdminStories'
// import { useDeletePost } from '@/hooks/useAdminPosts'
import { useBanUser, useWarnUser } from '@/hooks/useAdminPosts'
import { AdminContentCard } from '@/components/admin/AdminContentCard'
import { useSearchParams } from 'next/navigation'
import apiClient from '@/lib/api-client'

const filters = ['All', 'Latest', 'Trending', 'Reported']

export default function AdminStoriesPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50
  const [allStories, setAllStories] = useState<any[]>([])
  // const inputRef = useRef<HTMLInputElement | null>(null)
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
        const res = await apiClient.searchAll(qParam, 'stories', 1, 50)
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
          // handle nested shapes like { stories: { raw: [...], entities: [...] } }
          if (obj.stories && typeof obj.stories === 'object') {
            if (Array.isArray(obj.stories.raw)) out = out.concat(obj.stories.raw)
            if (Array.isArray(obj.stories.entities)) out = out.concat(obj.stories.entities)
          }
          return out
        }

        let items: any[] = []
        if (Array.isArray(raw)) items = raw
        else if (raw.data && Array.isArray(raw.data)) items = raw.data
        else if (raw.data && typeof raw.data === 'object') items = extract(raw.data)
        else items = extract(raw)

        const canonicalize = (it: any) => {
          if (!it) return it
          // DB/raw fields
          if (it.post_id || it.post_content || it.user_id || it.user_username || it.story_id) {
            return {
              id: it.story_id || it.post_id || it.id,
              type: it.type || it.post_type || it.story_type,
              title: it.title || it.post_title,
              content: it.post_content || it.content || it.story_content,
              cover_image: it.cover_image || it.post_cover_image || it.story_cover_image,
              media: it.media || [],
              upvotes: it.post_upvotes ?? it.upvotes,
              views: it.post_views ?? it.views,
              created_on: it.post_created_on ?? it.created_on,
              user: it.user || (it.user_id ? { id: it.user_id, username: it.user_username, full_name: it.user_full_name } : undefined),
              raw: it,
            }
          }
          return it
        }

        items = items.map(canonicalize)

        const filtered = (items || []).filter((i: any) => String(i.type || i.post_type || '').toUpperCase() === 'STORY')
        if (filtered.length > 0) {
          setSearchResults(filtered)
          return
        }

        // fallback: try fetching single blog/story by id
        const looksLikeId = /^[0-9a-fA-F-]{6,}$/.test(qParam) || /^\d+$/.test(qParam)
        if (looksLikeId) {
          try {
            const single = await apiClient.getBlogById(qParam)
            const blog = single?.data
            if (blog && String(blog.type || '').toUpperCase() === 'STORY') {
              setSearchResults([blog])
              return
            }
            if (blog) {
              setSearchResults([blog])
              return
            }
          } catch (e) {
            // ignore
          }
        }

        setSearchResults([])
      } catch (err) {
        setSearchResults([])
      }
    }

    run()
  }, [qParam])

  // // Debounced input -> call search API for stories
  // useEffect(() => {
  //   if (debounceRef.current) clearTimeout(debounceRef.current)
  //   if (!debouncedSearch) {
  //     if (!qParam) setSearchResults(null)
  //     return
  //   }

  //   debounceRef.current = setTimeout(async () => {
  //     try {
  //       const res = await apiClient.searchAll(debouncedSearch, 'stories', 1, 50)
  //       const items = res?.data?.items ?? res?.data ?? []
  //       const filtered = (items || []).filter((i: any) => String(i.type || '').toUpperCase() === 'STORY')
  //       setSearchResults(filtered)
  //     } catch (err) {
  //       setSearchResults([])
  //     }
  //   }, 300)

  //   return () => {
  //     if (debounceRef.current) clearTimeout(debounceRef.current)
  //   }
  // }, [debouncedSearch, qParam])

  // using simple client-side search, no autocomplete
  const { data: stories = [], isLoading } = useAdminStories(activeFilter, page, limit)

  useEffect(() => {
    if (!stories?.length) return

    setAllStories(prev => {
      const existingIds = new Set(prev.map(item => item.id))

      const newStories = stories.filter(
        (item: any) =>!existingIds.has(item.id)
      )

      return [...prev, ...newStories]
    })
  }, [stories])

  useEffect(() => {
    setPage(1)
    setAllStories([])
  }, [activeFilter])

  const deleteStory = useDeleteStory()
  // const deletePost = useDeletePost()
  const warnUser = useWarnUser()
  const banUser = useBanUser()
  const itemsToRender =
  searchResults !== null
    ? searchResults
    : allStories

  // const resolveCardType = (it: any) => {
  //   const t = String(it?.type || it?.post_type || '').toUpperCase()
  //   if (t === 'QUESTION') return 'question'
  //   if (t === 'BLOG' || t === 'ADMIN_BLOG') return 'blog'
  //   if (t === 'STORY') return 'story'
  //   return 'post'
  // }

  // const renderCard = (s: any) => {
  //   const cardType = resolveCardType(s) as any
  //   const author = {
  //     id: s.user?.id || '',
  //     name: s.user?.full_name || s.user?.username || 'Unknown',
  //     avatar: s.user?.profile_photo,
  //     title: s.user?.profession,
  //   }

  //   const common = {
  //     key: s.id,
  //     id: s.id,
  //     author,
  //     likes: s.upvotes ?? s.likes ?? 0,
  //     commentsCount: s.commentsCount ?? s.comments_count ?? s.comment_count ?? 0,
  //     views: s.views,
  //     createdOn: s.created_on,
  //   }

  //   if (cardType === 'story') {
  //     return (
  //       <AdminContentCard
  //         {...common}
  //         type={cardType}
  //         title={s.title}
  //         content={s.content}
  //         coverImage={s.cover_image}
  //         media={s.media || []}
  //         likes={s.upvotes ?? s.likes ?? 0}
  //         commentsCount={s.commentsCount ?? s.comments_count ?? s.comment_count ?? 0}
  //         views={s.views}
  //         createdOn={s.created_on}
  //         onDelete={(id) => deleteStory.mutate(id)}
  //       />
  //     )
  //   }

  //   if (cardType === 'question') {
  //     return (
  //       <AdminContentCard
  //         {...common}
  //         type="question"
  //         title={s.content}
  //         content={s.description}
  //         onWarn={(uid) => warnUser.mutate(uid)}
  //         onBan={(uid) => banUser.mutate(uid)}
  //         onDelete={(id) => deleteStory.mutate(id)}
  //       />
  //     )
  //   }

  //   // default: post
  //   return (
  //     <AdminContentCard
  //       {...common}
  //       type="post"
  //       content={s.content}
  //       media={s.media || []}
  //       tags={s.tags || []}
  //       onWarn={(uid) => warnUser.mutate(uid)}
  //       onBan={(uid) => banUser.mutate(uid)}
  //       onDelete={(id) => deletePost.mutate(id)}
  //     />
  //   )
  // }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#212529' }}>Stories Management</h1>
          <Button onClick={() => setShowCreate(true)}>Create Story</Button>
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
              placeholder="Search stories, authors..."
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : itemsToRender.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No stories found.</div>
        ) : (
          itemsToRender
            .filter((s: any) => {
              if (!debouncedSearch) return true
              const q = debouncedSearch.toLowerCase()
              const author = (s.user?.full_name || s.user?.username || '').toLowerCase()
              const content = (s.content || s.title || '').toLowerCase()
              const title = (s.title || '').toLowerCase()
              return author.includes(q) || content.includes(q) || title.includes(q)
            })
            .map((s: any) => (
            <AdminContentCard
              key={s.id}
              id={s.id}
              type="story"
              author={{
                id: s.user?.id || '',
                name: s.user?.full_name || s.user?.username || 'Unknown',
                avatar: s.user?.profile_photo,
                title: s.user?.profession,
              }}
              title={s.title}
              content={s.content}
              coverImage={s.cover_image}
              media={s.media || []}
              likes={s.upvotes ?? s.likes ?? 0}
              commentsCount={s.commentsCount ?? s.comments_count ?? s.comment_count ?? 0}
              views={s.views}
              createdOn={s.created_on}
              onWarn={(uid) => warnUser.mutate(uid)}
              onBan={(uid) => banUser.mutate(uid)}
              onDelete={(id) => deleteStory.mutate(id)}
            />
          ))
        )}
        {stories.length >= limit && searchResults === null && (
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl">
            <AdminCreateStoryBox onCreated={() => setShowCreate(false)} />
            <div className="text-center mt-4">
              <Button onClick={() => setShowCreate(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}