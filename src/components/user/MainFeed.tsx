'use client'

import {
  Search,
  Home,
  HelpCircle,
  ImageIcon,
  X,
  Loader2,
  User,
  Users,
  FileQuestion,
} from 'lucide-react'
import { useAuthWall } from '@/providers/AuthWallProvider'

import { FeedPost } from './FeedPost'
import { CreatePostBox } from './CreatePostBox'
import { QuestionPost } from './QuestionPost'
import { StoryPost } from './StoryPost'
import { PostQuestionBox } from './PostQuestionBox'
import { ShareStoryBox } from './ShareStoryBox'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFeedPosts } from '../../hooks/useFeedPosts'
import { useStoriesFeed } from '../../hooks/useStoriesFeed'
import apiClient from '../../lib/api-client'

// ── highlight matching text ────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-black rounded-sm px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function MainFeed() {
  const { showLoginModal } =
    useAuthWall()

  const [guestWallShown,
    setGuestWallShown] =
    useState(false)
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'home' | 'qa' | 'stories'>('home')

  useEffect(() => {
    if (
      typeof window === 'undefined'
    )
      return

    const user =
      localStorage.getItem('user')

    if (user) return

    const handleScroll = () => {
      if (guestWallShown) return

      const scrollPercent =
        window.scrollY /
        (document.body.scrollHeight -
          window.innerHeight)

      if (scrollPercent > 0.25) {
        setGuestWallShown(true)

        setTimeout(() => {
          showLoginModal()
        }, 500)
      }
    }

    window.addEventListener(
      'scroll',
      handleScroll
    )

    return () =>
      window.removeEventListener(
        'scroll',
        handleScroll
      )
  }, [
    guestWallShown,
    showLoginModal,
  ])

  // Allow external links to open a specific tab and focus the composer
  useEffect(() => {
    try {
      const tab = searchParams?.get?.('tab')
      const compose = searchParams?.get?.('compose')
      if (tab === 'home' || tab === 'qa' || tab === 'stories') {
        setActiveTab(tab)
      }
      if (compose === '1') {
        setTimeout(() => {
          const root = document.querySelector('.create-box') as HTMLElement | null
          if (root) {
            const input = root.querySelector('textarea, input') as HTMLElement | null
            input?.focus()
            root.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }, 50)
      }
    } catch {}
  }, [searchParams])

  const {
    data: postPages,
    isLoading: postsLoading,
    fetchNextPage: fetchMorePosts,
    hasNextPage: hasMorePosts,
    isFetchingNextPage: loadingMorePosts,
  } = useFeedPosts('NORMAL')

  const {
    data: questionPages,
    isLoading: questionsLoading,
    fetchNextPage: fetchMoreQuestions,
    hasNextPage: hasMoreQuestions,
    isFetchingNextPage: loadingMoreQuestions,
  } = useFeedPosts('QUESTION')
  
  const {
    data: storyPages,
    isLoading: storiesLoading,
    fetchNextPage: fetchMoreStories,
    hasNextPage: hasMoreStories,
    isFetchingNextPage:
      loadingMoreStories,
  } = useStoriesFeed()

  const stories =
    storyPages?.pages.flatMap(
      page => page.data
    ) || []

  const posts =
    postPages?.pages.flatMap(
      page => page.data
    ) || []

  const questions =
    questionPages?.pages.flatMap(
      page => page.data
    ) || []

  // ── Search state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ users: any[]; groups: any[]; questions: any[]; posts: any[]; blogs: any[]; stories: any[] }>({
    users: [],
    groups: [],
    questions: [],
    posts: [], blogs: [], stories: [] 
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        entries => {
          if (
            entries[0].isIntersecting
          ) {
            if (
              activeTab === 'home' &&
              hasMorePosts &&
              !loadingMorePosts
            ) {
              fetchMorePosts()
            }

            if (
              activeTab === 'qa' &&
              hasMoreQuestions &&
              !loadingMoreQuestions
            ) {
              fetchMoreQuestions()
            }

            if (
              activeTab === 'stories' &&
              hasMoreStories &&
              !loadingMoreStories
            ) {
              fetchMoreStories()
            }
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
    activeTab,
    hasMorePosts,
    loadingMorePosts,
    hasMoreQuestions,
    loadingMoreQuestions,
    hasMoreStories,
    loadingMoreStories,
    fetchMorePosts,
    fetchMoreQuestions,
    fetchMoreStories,
  ])

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSuggestions({ users: [], groups: [], questions: [], posts: [], blogs: [], stories: [] })
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const res = await apiClient.searchSuggestions(searchQuery)
        setSuggestions(res.data ?? { users: [], groups: [], questions: [], posts: [], blogs: [], stories: [] })
        setShowSuggestions(true)
      } catch {
        setSuggestions({ users: [], groups: [], questions: [], posts: [], blogs: [], stories: [] })
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const hasSuggestions =
    (suggestions.questions?.length ?? 0) +
    (suggestions.users?.length ?? 0) +
    (suggestions.groups?.length ?? 0) > 0

  // Full search
  const handleSearch = (q = searchQuery) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setShowSuggestions(false)
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSuggestions({ users: [], groups: [], questions: [], posts: [], blogs: [], stories: [] })
    setShowSuggestions(false)
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-y-auto overflow-x-hidden bg-[#F8F9FA]">
      <div className="max-w-3xl mx-auto">

        {/* 🔍 Search Bar */}
        <div className="mb-6 relative" ref={searchBarRef}>
            <button
              type="button"
              onClick={() => handleSearch()}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-purple-600 transition"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder="Search for Q&A, Post, Stories, People…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => { if (hasSuggestions) setShowSuggestions(true) }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              className="w-full pl-14 pr-12 py-4 rounded-2xl bg-white shadow-sm border border-gray-200 focus:outline-none focus:border-gray-400 transition"
            />
            {suggestionsLoading && (
              <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
            )}
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {showSuggestions && hasSuggestions && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

              {/* Questions */}
              {suggestions.questions?.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Questions
                  </div>
                  {suggestions.questions.map((q: any) => (
                    <button
                      key={q.id}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition"
                      onMouseDown={() => {
                        const text = (q.content ?? '').substring(0, 80)
                        setSearchQuery(text)
                        handleSearch(text)
                      }}
                    >
                      <FileQuestion className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        <Highlight text={q.content ?? ''} query={searchQuery} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Posts */}
              {suggestions.posts?.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Posts
                  </div>
                  {suggestions.posts.map((p: any) => (
                    <button
                      key={p.id}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition"
                      onMouseDown={() => {
                        const text = (p.content ?? '').substring(0, 80)
                        setSearchQuery(text)
                        handleSearch(text)
                      }}
                    >
                      <FileQuestion className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        <Highlight text={p.content ?? ''} query={searchQuery} />
                      </span>
                    </button>
                  ))}
                </div>
              )}


              {/* Stories */}
              {suggestions.stories?.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Stories
                  </div>
                  {suggestions.stories.map((s: any) => (
                    <button
                      key={s.id}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition"
                      onMouseDown={() => {
                        const text = (s.content ?? '').substring(0, 80)
                        setSearchQuery(text)
                        handleSearch(text)
                      }}
                    >
                      <FileQuestion className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        <Highlight text={s.content ?? ''} query={searchQuery} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Blogs */}
              {suggestions.blogs?.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Blogs
                  </div>
                  {suggestions.blogs.map((b: any) => (
                    <button
                      key={b.id}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition"
                      onMouseDown={() => {
                        const text = (b.content ?? '').substring(0, 80)
                        setSearchQuery(text)
                        handleSearch(text)
                      }}
                    >
                      <FileQuestion className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        <Highlight text={b.content ?? ''} query={searchQuery} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Users */}
              {suggestions.users?.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    People
                  </div>
                  {suggestions.users.map((u: any) => (
                    <button
                      key={u.id}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition"
                      onMouseDown={() => {
                        setSearchQuery(u.username)
                        handleSearch(u.username)
                      }}
                    >
                      <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        <Highlight text={u.username} query={searchQuery} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Groups */}
              {suggestions.groups?.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Groups
                  </div>
                  {suggestions.groups.map((g: any) => (
                    <button
                      key={g.id}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition"
                      onMouseDown={() => {
                        setSearchQuery(g.name)
                        handleSearch(g.name)
                      }}
                    >
                      <Users className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        <Highlight text={g.name} query={searchQuery} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium transition"
                  onMouseDown={() => handleSearch()}
                >
                  See all results for &ldquo;{searchQuery}&rdquo;
                </button>
              </div>
            </div>
          )}

        {/* 🧭 Tabs */}
            <div className="bg-white rounded-2xl shadow-sm p-2 mb-6 flex gap-2 border border-gray-200">
              <button
                onClick={() => setActiveTab('home')}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'home' ? 'bg-black text-white' : 'text-gray-500'
                }`}
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Home Feed</span>
              </button>

              <button
                onClick={() => setActiveTab('qa')}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'qa' ? 'bg-black text-white' : 'text-gray-500'
                }`}
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Q&A</span>
              </button>

              <button
                onClick={() => setActiveTab('stories')}
                className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'stories' ? 'bg-black text-white' : 'text-gray-500'
                }`}
              >
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Stories</span>
              </button>
            </div>

            {/* 🏠 HOME FEED */}
            {activeTab === 'home' && (
              <>
                <div className="create-box">
                  <CreatePostBox />
                </div>
                <div>
                  {postsLoading ? (
                    <div>Loading...</div>
                  ) : (
                    (Array.isArray(posts) ? posts : []).map((post: any) => (
                      <FeedPost key={post.id} {...post} />
                    ))
                  )}
                  {/* Infinite Scroll Trigger */}
                  <div
                    ref={loadMoreRef}
                    className="py-6 flex justify-center"
                  >
                    {loadingMorePosts && (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ❓ Q&A */}
            {activeTab === 'qa' && (
              <>
                <div className="create-box">
                  <PostQuestionBox />
                </div>
                <div>
                  {questionsLoading ? (
                    <div>Loading...</div>
                  ) : (
                    (Array.isArray(questions) ? questions : []).map((q: any) => (
                      <QuestionPost key={q.id} {...q} />
                    ))
                  )}
                  <div
                    ref={loadMoreRef}
                    className="py-6 flex justify-center"
                  >
                    {loadingMoreQuestions && (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 📖 STORIES */}
            {activeTab === 'stories' && (
              <>
                <div className="create-box">
                  <ShareStoryBox />
                </div>
                <div>
                  {storiesLoading ? (
                    <div>Loading...</div>
                  ) : (
                    (Array.isArray(stories) ? stories : []).map((story: any) => (
                      <StoryPost key={story.id} {...story} />
                    ))
                  )}
                  <div
                    ref={loadMoreRef}
                    className="py-6 flex justify-center"
                  >
                    {loadingMoreStories && (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                  </div>
                </div>
              </>
            )}
        </div>
      </main>
  )
}