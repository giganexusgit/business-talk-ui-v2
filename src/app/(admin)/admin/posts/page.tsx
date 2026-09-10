'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/shared/Button'
import { AdminCreatePostBox } from '@/components/admin/AdminCreatePostBox'
import { useAdminPosts, useDeletePost, useWarnUser, useBanUser } from '@/hooks/useAdminPosts'
import { AdminContentCard } from '@/components/admin/AdminContentCard'
import { useSearchParams } from 'next/navigation'
import apiClient from '@/lib/api-client'

const filters = ['All', 'Latest', 'Trending', 'Reported']

export default function AdminPostsPage() {
  const [filter, setFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50
  const [allPosts, setAllPosts] = useState<any[]>([])
  const searchParams = useSearchParams()
  const qParam = searchParams?.get('q') || ''

  useEffect(() => {
    if (!qParam) {
      setSearchResults(null)
      return
    }

    const run = async () => {
      try {
        const res = await apiClient.searchAll(qParam, 'posts', 1, 50)
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

        // filter out QUESTION type for Posts page (show only normal posts)
        const filtered = (items || []).filter((i: any) => String(i.type || i.post_type || '').toUpperCase() !== 'QUESTION')
        setSearchResults(filtered)
      } catch (err) {
        setSearchResults([])
      }
    }

    run()
  }, [qParam])

  const { data: posts = [], isLoading } = useAdminPosts(filter, page,  limit)

  useEffect(() => {
    if (!posts?.length) return

    setAllPosts(prev => {
      const existingIds = new Set(prev.map(item => item.id))

      const newPosts = posts.filter(
        item => !existingIds.has(item.id)
      )

      return [...prev, ...newPosts]
    })
  }, [posts])

  useEffect(() => {
    setPage(1)
    setAllPosts([])
  }, [filter])

  const deletePost = useDeletePost()
  const warnUser = useWarnUser()
  const banUser = useBanUser()
  const itemsToRender =
  searchResults !== null
    ? searchResults
    : allPosts

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#212529' }}>Posts Management</h1>
          <Button onClick={() => setShowCreate(true)}>Create Post</Button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: filter === f ? '#212529' : '#fff',
                color: filter === f ? '#fff' : '#5F6368',
                border: '1px solid #E8E8E8',
              }}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => setDebouncedSearch(e.target.value), 300)
              }}
              placeholder="Search posts, authors..."
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : itemsToRender.length === 0 ? (
          <div className="py-16 text-center text-gray-400">No posts found.</div>
        ) : (
          <>
            {itemsToRender
              .filter((p: any) => {
                if (!debouncedSearch) return true
                const q = debouncedSearch.toLowerCase()
                const author = (p.user?.full_name || p.user?.username || '').toLowerCase()
                const content = (p.content || p.title || '').toLowerCase()
                return author.includes(q) || content.includes(q)
              })
              .map((p: any) => (
                <AdminContentCard
                  key={p.id}
                  id={p.id}
                  type="post"
                  author={{
                    id: p.user?.id || '',
                    name: p.user?.full_name || p.user?.username || 'Unknown',
                    avatar: p.user?.profile_photo,
                    title: p.user?.profession,
                  }}
                  content={p.content}
                  media={p.media || []}
                  tags={p.tags || []}
                  likes={p.upvotes ?? p.likes ?? 0}
                  commentsCount={p.commentsCount ?? p.comments_count ?? p.comment_count ?? 0}
                  views={p.views}
                  createdOn={p.created_on}
                  onWarn={(uid) => warnUser.mutate(uid)}
                  onBan={(uid) => banUser.mutate(uid)}
                  onDelete={(id) => deletePost.mutate(id)}
                />
              ))}

            {posts.length >= limit && searchResults === null && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={() => setPage(prev => prev + 1)}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl">
            <AdminCreatePostBox onCreated={() => setShowCreate(false)} />
            <div className="text-center mt-4">
              <Button onClick={() => setShowCreate(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}