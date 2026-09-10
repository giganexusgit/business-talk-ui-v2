'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/shared/Button'
// import { useRouter } from 'next/navigation'
import { AdminCreateQuestionBox } from '@/components/admin/AdminCreateQuestionBox'
import { useAdminQuestions, useDeleteQuestion } from '@/hooks/useAdminQuestions'
import { useWarnUser, useBanUser, useDeletePost } from '@/hooks/useAdminPosts'
import { AdminContentCard } from '@/components/admin/AdminContentCard'
import { useSearchParams } from 'next/navigation'
import apiClient from '@/lib/api-client'

const filters = ['All', 'Latest', 'Trending', 'Reported']

export default function AdminQuestionsPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // const inputRef = useRef<HTMLInputElement | null>(null)
  // const router = useRouter()
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50
  const [allQuestions, setAllQuestions] = useState<any[]>([])
  const searchParams = useSearchParams()
  const qParam = searchParams?.get('q') || ''

  useEffect(() => {
    if (!qParam) {
      setSearchResults(null)
      return
    }

    const run = async () => {
      try {
        const res = await apiClient.searchAll(qParam, 'questions', 1, 50)
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
          // handle nested shapes like { questions: { raw: [...], entities: [...] } }
          if (obj.questions && typeof obj.questions === 'object') {
            if (Array.isArray(obj.questions.raw)) out = out.concat(obj.questions.raw)
            if (Array.isArray(obj.questions.entities)) out = out.concat(obj.questions.entities)
          }
          return out
        }

        let items: any[] = []
        if (Array.isArray(raw)) items = raw
        else if (raw.data && Array.isArray(raw.data)) items = raw.data
        else if (raw.data && typeof raw.data === 'object') items = extract(raw.data)
        else items = extract(raw)

        // canonicalize DB-like fields to a consistent shape
        const canonicalize = (it: any) => {
          if (!it) return it
          // if item uses post_* / user_* fields from DB/raw responses
          if (it.post_id || it.post_content || it.user_id || it.user_username || it.post_created_on) {
            return {
              id: it.post_id || it.id,
              type: it.post_type || it.type,
              content: it.post_content || it.content,
              description: it.post_description || it.description || '',
              upvotes: it.post_upvotes ?? it.upvotes,
              views: it.post_views ?? it.views,
              created_on: it.post_created_on ?? it.created_on,
              user: {
                id: it.user_id || it.post_user_id || it.user?.id,
                username: it.user_username || it.user?.username,
                full_name: it.user_full_name || it.user?.full_name || it.user?.username,
                profile_photo: it.user_profile_photo || it.user?.profile_photo || it.user?.profile_photo,
              },
              // copy other fields through
              raw: it,
            }
          }
          // already normalized or other shapes
          return it
        }

        items = items.map(canonicalize)

        // prefer QUESTION type but accept posts if none
        const filtered = (items || []).filter((i: any) => String(i.type || i.post_type || '').toUpperCase() === 'QUESTION')
        if (filtered.length > 0) {
          setSearchResults(filtered)
          return
        }

        if (items.length > 0) {
          setSearchResults(items)
          return
        }

        // fallback: if qParam looks like an id, try fetching single post by id
        const looksLikeId = /^[0-9a-fA-F-]{6,}$/.test(qParam) || /^\d+$/.test(qParam)
        if (looksLikeId) {
          try {
            const single = await apiClient.getPostById(qParam)
            const post = single?.data
            if (post) {
              setSearchResults([post])
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

  // // Debounced search input -> call search API for questions
  // useEffect(() => {
  //   if (debounceRef.current) clearTimeout(debounceRef.current)
  //   if (!debouncedSearch) {
  //     // if empty, clear results (unless qParam present)
  //     if (!qParam) setSearchResults(null)
  //     return
  //   }

  //   debounceRef.current = setTimeout(async () => {
  //     try {
  //       const res = await apiClient.searchAll(debouncedSearch, 'questions', 1, 50)
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
  //       const filtered = (items || []).filter((i: any) => String(i.type || '').toUpperCase() === 'QUESTION')
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

  const { data: questions = [], isLoading } = useAdminQuestions(activeFilter, page, limit)
  
  useEffect(() => {
    if (!questions?.length) return

    setAllQuestions(prev => {
      const existingIds = new Set(prev.map((item: any) =>item.id))

      const newQuestions = questions.filter(
        (item: any) =>!existingIds.has(item.id)
      )

      return [...prev, ...newQuestions]
    })
  }, [questions])

  useEffect(() => {
    setPage(1)
    setAllQuestions([])
  }, [activeFilter])

  const deleteQuestion = useDeleteQuestion()
  const warnUser = useWarnUser()
  const banUser = useBanUser()
  const deletePost = useDeletePost()
  const items =
  searchResults !== null
    ? searchResults
    : allQuestions

  // dedupe items by canonical type+id to avoid duplicate React keys from backend shapes
  const itemsToRender = (() => {
    const seen = new Set<string>()
    const out: any[] = []
    for (const it of (items || [])) {
      const id = String(it?.id ?? it?._id ?? it?.post_id ?? it?.blog_id ?? it?.story_id ?? '').trim()
      const type = String(it?.type || it?.post_type || it?.__source || '').toLowerCase()
      const key = `${type}:${id}`
      if (!id) {
        // fallback: use object identity if no id present
        const fallbackKey = JSON.stringify(it)
        if (!seen.has(fallbackKey)) {
          seen.add(fallbackKey)
          out.push(it)
        }
      } else if (!seen.has(key)) {
        seen.add(key)
        out.push(it)
      }
    }
    return out
  })()

  const resolveCardType = (it: any) => {
    const t = String(it?.type || it?.post_type || '').toUpperCase()
    if (t === 'QUESTION') return 'question'
    if (t === 'BLOG' || t === 'ADMIN_BLOG') return 'blog'
    if (t === 'STORY') return 'story'
    return 'post'
  }

  const renderCard = (it: any) => {
    const cardType = resolveCardType(it) as any
    const author = {
      id: it.user?.id || '',
      name: it.user?.full_name || it.user?.username || 'Unknown',
      avatar: it.user?.profile_photo,
      title: it.user?.profession,
    }

    const common = {
      key: it.id,
      id: it.id,
      author,
      likes: it.upvotes ?? it.likes ?? 0,
      commentsCount: it.commentsCount ?? it.comments_count ?? it.comment_count ?? 0,
      views: it.views,
      createdOn: it.created_on,
    }

    if (cardType === 'question') {
      return (
        <AdminContentCard
          {...common}
          type="question"
          title={it.title}
          content={it.content}
          tags={it.tags || []}
          onWarn={(uid) => warnUser.mutate(uid)}
          onBan={(uid) => banUser.mutate(uid)}
          onDelete={(id) => deleteQuestion.mutate(id)}
        />
      )
    }

    if (cardType === 'blog' || cardType === 'story') {
      return (
        <AdminContentCard
          {...common}
          type={cardType}
          title={it.title}
          content={it.content}
          coverImage={it.cover_image}
          media={it.media || []}
          tags={it.tags || []}
          onDelete={(id) => {
            // prefer blog/story delete hook if available; fallback to post delete
            deleteQuestion.mutate(id)
          }}
        />
      )
    }

    // default: post
    return (
      <AdminContentCard
        {...common}
        type="post"
        content={it.content}
        media={it.media || []}
        tags={it.tags || []}
        onWarn={(uid) => warnUser.mutate(uid)}
        onBan={(uid) => banUser.mutate(uid)}
        onDelete={(id) => deletePost.mutate(id)}
      />
    )
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#212529' }}>Questions Management</h1>
          <Button onClick={() => setShowCreate(true)}>Create Question</Button>
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
          <div className="py-16 text-center text-gray-400">No questions found.</div>
        ) : (
          <>
            {itemsToRender
              .filter((q: any) => {
                if (!debouncedSearch) return true
                const ql = debouncedSearch.toLowerCase()
                const author = (q.user?.full_name || q.user?.username || '').toLowerCase()
                const content = ((q.content || q.title) + ' ' + (q.description || '')).toLowerCase()
                return author.includes(ql) || content.includes(ql)
              })
              .map((q: any) => renderCard(q))}
            {questions.length >= limit && searchResults === null && (
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
            <AdminCreateQuestionBox onCreated={() => setShowCreate(false)} />
            <div className="text-center mt-4">
              <Button onClick={() => setShowCreate(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}