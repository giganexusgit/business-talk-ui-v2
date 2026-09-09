'use client'

import { Bell, Search, Menu, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { profileHref } from '@/lib/profile-link'
import { usePathname, useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/redux/store'
import { getUnreadCount } from '@/redux/slices/notificationsSlice'
import { useAuth } from '@/hooks/useRedux'
import { useNotifications } from '@/hooks/useNotifications'
import { useRef, useCallback, useState, useEffect } from 'react'
import apiClient from '@/lib/api-client'
import { MobileSidebar } from './MobileSidebar'
import { normalizeHashtag } from '@/lib/hashtag'

interface UserNavbarProps {
  onMenuClick?: () => void
  children?: React.ReactNode
}

// ─── Search result types ───────────────────────────────────────────────────
interface SearchResult {
  id: string
  label: string
  sublabel?: string
  type: 'user' | 'post' | 'blog' | 'story' | 'group' | 'tag'
  href: string
  avatar?: string
}

function typeLabel(type: SearchResult['type']): string {
  const map: Record<SearchResult['type'], string> = {
    user: 'Person', post: 'Post', blog: 'Blog', story: 'Story', group: 'Group', tag: 'Tag',
  }
  return map[type] ?? type
}

function mapSearchResults(data: any): SearchResult[] {
  const results: SearchResult[] = []

  const users: any[] = data?.users ?? []
  users.forEach((u: any) => {
    results.push({
      id: u.id,
      label: u.full_name || u.username || 'Unknown',
      sublabel: u.profession || u.email,
      type: 'user',
      href: profileHref(u.id, u.full_name),
      avatar: u.profile_photo,
    })
  })

  const posts: any[] = data?.posts ?? []
  posts.forEach((p: any) => {
    if (p.type === 'QUESTION') {
      results.push({ id: p.id, label: p.title || p.content?.slice(0, 60) || 'Question', type: 'post', href: `/questions/${p.id}` })
    } else {
      results.push({ id: p.id, label: p.content?.slice(0, 60) || 'Post', type: 'post', href: `/posts/${p.id}` })
    }
  })

  const blogs: any[] = data?.blogs ?? []
  blogs.forEach((b: any) => {
    const isStory = b.type === 'STORY'
    results.push({
      id: b.id,
      label: b.title || b.content?.slice(0, 60) || (isStory ? 'Story' : 'Blog'),
      type: isStory ? 'story' : 'blog',
      href: isStory ? `/stories/${b.id}` : `/blogs/${b.id}`,
    })
  })

  const groups: any[] = data?.groups ?? []
  groups.forEach((g: any) => {
    results.push({ id: g.id, label: g.name || 'Group', sublabel: g.description?.slice(0, 40), type: 'group', href: `/groups/${g.id}` })
  })

  const tags: any[] = data?.tags ?? []
  tags.forEach((t: any) => {
    const rawName = typeof t === 'string' ? t : (t.name ?? t.tag ?? String(t))
    const tag = normalizeHashtag(rawName)
    if (tag) {
      results.push({ id: tag, label: `#${tag}`, type: 'tag', href: `/hashtags/${encodeURIComponent(tag)}` })
    }
  })

  return results
}

// ─── Inline SearchBar component ────────────────────────────────────────────
function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      setError(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const res = await apiClient.searchAll(q.trim())
      const mapped = mapSearchResults(res.data)
      setResults(mapped)
      setOpen(true)
    } catch {
      setError(true)
      setResults([])
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setResults([])
      setOpen(false)
      setError(false)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(val), 350)
  }

  const handleFullSearch = (qStr = query) => {
    const trimmed = qStr.trim()
    if (!trimmed) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleFullSearch()
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative flex-1 max-w-[420px]">
      <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2">
        <button
          type="button"
          onClick={() => handleFullSearch()}
          className="shrink-0 text-gray-500 hover:text-purple-600 transition-colors"
          aria-label="Submit search"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 text-gray-400 shrink-0 animate-spin" />
          ) : (
            <Search className="h-4 w-4 shrink-0" />
          )}
        </button>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0 || error) setOpen(true) }}
          placeholder="Search for Q&A, Posts, Stories, People..."
          className="bg-transparent outline-none text-sm w-full"
          aria-label="Global search"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {error ? (
            <p className="px-4 py-3 text-sm text-red-500">Search failed. Please try again.</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No results for &quot;{query}&quot;</p>
          ) : (
            <>
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                >
                  {r.avatar ? (
                    <img src={r.avatar} alt={r.label} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <Search className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                    {r.sublabel && <p className="text-xs text-gray-500 truncate">{r.sublabel}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{typeLabel(r.type)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleFullSearch()}
                className="w-full text-center py-2.5 bg-gray-50 hover:bg-purple-50 text-xs font-semibold text-purple-600 border-t border-gray-100 transition-colors flex items-center justify-center gap-1"
              >
                <Search className="w-3.5 h-3.5" /> See all results for &quot;{query}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}



export const UserNavbar = ({ onMenuClick, children }: UserNavbarProps) => {
  const { user, isAuthenticated } = useAuth()
  const { unreadCount } = useNotifications()
  const dispatch = useDispatch<AppDispatch>()
  const pathname = usePathname()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  // Re-fetch unread count on every route change so the badge is always in sync
  useEffect(() => {
    dispatch(getUnreadCount())
  }, [pathname, dispatch])

  // ✅ Fix hydration mismatch
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [user?.id])

  const getInitials = (value?: string) => {
    const normalized = (value || '').trim()
    if (!normalized) return 'U'

    const parts = normalized.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }

    return normalized.slice(0, 2).toUpperCase()
  }

  const profilePhoto = (user as any)?.profile_photo || user?.avatar
  const initials = getInitials((user as any)?.full_name || user?.username || user?.name)

  const handleMenuClick = () => {
    setIsSidebarOpen((open) => !open)
    onMenuClick?.()
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 w-full z-40 bg-white border-b border-gray-200 lg:pl-64"
        style={{ height: '64px' }}
      >
        <div className="px-4 lg:px-6 h-full flex items-center justify-between">
          
          {/* Mobile Menu Button */}
          <button
            onClick={handleMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>

          {/* Logo for mobile */}
          <div className="lg:hidden flex-shrink-0">
            <Link href="/dashboard" aria-label="Go to home feed" className="hover:opacity-80 transition-opacity">
              <img 
                src="/assets/logos/BUSINESSTALK24_LOGO_png.png" 
                alt="BusinessTalk24 Logo" 
                width={160}
                height={100}
                className="mb-2"
              />
            </Link>
          </div>

          {/* Search */}
          <div className="hidden lg:flex flex-1 mx-4">
            <SearchBar />
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            
            {/* Notification */}
            <Link href="/notifications">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="h-6 w-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </button>
            </Link>

            {/* ✅ Avatar (hydration safe) */}
            {mounted && isAuthenticated && user && (
              <Link href="/profile">
                {profilePhoto && !avatarLoadFailed ? (
                  <img
                    src={profilePhoto || `https://ui-avatars.com/api/name=${encodeURIComponent(initials)}`}
                    alt={(user as any)?.full_name || user?.username || user?.name || 'User'}
                    className="h-9 w-9 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-[#212529] text-white flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
                    {initials}
                  </div>
                )}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      >
        {children}
      </MobileSidebar>
    </>
  )
}