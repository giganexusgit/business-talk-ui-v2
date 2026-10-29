'use client'

// // import { Card } from '@/components/shared/Card'

// export default function AdminNotificationsPage() {
//   return (
//     <div>
//       <h1 className="text-3xl font-bold text-secondary-900 mb-6">Notifications</h1>
//       <Card>
//         <p className="text-secondary-600">Notifications management interface coming soon</p>
//       </Card>
//     </div>
//   )
// }
import { CheckCheck } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useWebSocket } from '@/providers/WebSocketProvider'
import { useRouter } from 'next/navigation'
import { NotificationList } from '@/components/notifications/NotificationList'
import apiClient from '@/lib/api-client'
import { resolveAdminNotificationRoute } from '@/lib/notificationRegistry'

// ✅ UPDATED TYPE
export interface Notification {
  id: string
  type: string

  user: {
    name: string
    avatar: string
  }

  message: string

  timestamp: string // formatted
  rawTimestamp: number // 🔥 used for sorting

  is_read: boolean

  entity_id: string
  entity_type: string
}

const parseTimestampMs = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Date.now()
  const asNum = Number(raw)
  if (Number.isFinite(asNum) && asNum > 0) return asNum
  const fromDate = new Date(String(raw ?? '')).getTime()
  return Number.isFinite(fromDate) && fromDate > 0 ? fromDate : Date.now()
}

const safeType = (raw: unknown): string => {
  const t = String(raw ?? '').trim()
  return t.length ? t : 'unknown'
}

const safeId = (raw: unknown, seed: string): string => {
  const id = String(raw ?? '').trim()
  return id.length ? id : `notif-${seed}`
}

const dedupeById = (items: Notification[]): Notification[] => {
  const map = new Map<string, Notification>()
  for (const item of items) {
    const prev = map.get(item.id)
    if (!prev || item.rawTimestamp >= prev.rawTimestamp) {
      map.set(item.id, item)
    }
  }
  return Array.from(map.values())
}

const isReportedContentNotification = (n: Notification) => {
  const type = String(n.type || '').toLowerCase()
  const message = String(n.message || '').toLowerCase()
  const entityType = String(n.entity_type || '').toLowerCase()

  const hasReportKeyword = type.includes('report') || message.includes('report')
  const isContentEntity = ['post', 'blog', 'comment', 'question', 'story'].includes(entityType)

  return hasReportKeyword && isContentEntity
}

const isWarningNotification = (n: Notification) => {
  const type = String(n.type || '').toLowerCase()
  const message = String(n.message || '').toLowerCase()
  return type.includes('warn') || message.includes('warn')
}

// ✅ TIME FORMATTER
const getTimeAgo = (ts: string) => {
  const diff = Date.now() - Number(ts)

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(diff / 604800000)
  const months = Math.floor(diff / 2629800000)
  const years = Math.floor(diff / 31557600000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  if (weeks < 4) return `${weeks}w`
  if (months < 12) return `${months}mo`
  return `${years}y`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const router = useRouter()
  const { wsManager } = useWebSocket()

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      setError(null)

      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          apiClient.getAdminNotifications(page),
          apiClient.getAdminUnreadNotificationCount(),
        ])

        // Backend returns { data: [...], pagination: { total, page, limit, totalPages }, unread_in_page }
        const raw: any[] = notificationsRes.data?.data ?? []

        const mapped: Notification[] = raw.map((n: any, index: number) => {
          // Admin notifications only carry actor_id — no actor object is returned by the API
          const actorName = 'System'
          const actorAvatar = '/assets/images/default-avatar.png'

          const rawTimestamp = parseTimestampMs(n.created_on ?? n.created_at)
          const id = safeId(
            n.id,
            `${rawTimestamp}-${safeType(n.type)}-${index}`,
          )

          return {
            id,
            type: safeType(n.type),
            user: { name: actorName, avatar: actorAvatar },
            message: String(n.message ?? ''),
            timestamp: getTimeAgo(String(rawTimestamp)),
            rawTimestamp,
            is_read: n.is_read === true,
            entity_id: String(n.entity_id ?? ''),
            entity_type: String(n.entity_type ?? ''),
          }
        })

        const normalized = dedupeById(mapped).sort((a, b) => b.rawTimestamp - a.rawTimestamp)

        setNotifications(normalized)
        setUnreadCount(Number(unreadRes.data?.unread || 0))
        setTotalPages(notificationsRes.data?.pagination?.totalPages ?? 1)
      } catch (e: any) {
        console.error('Notification fetch failed', e)
        setError('Failed to load notifications.')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [page])

  // ── WebSocket: new notification arrives ─────────────────────────────────
  useEffect(() => {
    if (!wsManager) return

    const handler = (data: any) => {
      const actorRaw = data.actor ?? data.sender ?? {}
      const actorName =
        actorRaw?.full_name || actorRaw?.name || actorRaw?.username ||
        data.actor_name || 'Unknown'
      const actorAvatar =
        actorRaw?.profile_photo || actorRaw?.avatar ||
        data.actor_avatar || '/assets/images/default-avatar.png'

      const rawTimestamp = parseTimestampMs(data.created_on ?? data.created_at)
      const id = safeId(
        data.id,
        `${rawTimestamp}-${safeType(data.type)}-ws`,
      )

      const newNotification: Notification = {
        id,
        type: safeType(data.type),
        user: { name: actorName, avatar: actorAvatar },
        message: String(data.message ?? ''),
        timestamp: getTimeAgo(String(rawTimestamp)),
        rawTimestamp,
        is_read: false,
        entity_id: String(data.entity_id ?? ''),
        entity_type: String(data.entity_type ?? ''),
      }

      setNotifications((prev) => {
        const existingIdx = prev.findIndex((n) => n.id === newNotification.id)
        if (existingIdx !== -1) {
          const next = prev.slice()
          next[existingIdx] = { ...next[existingIdx], ...newNotification }
          return next.sort((a, b) => b.rawTimestamp - a.rawTimestamp)
        }
        return [newNotification, ...prev]
      })
      setUnreadCount((prev) => prev + 1)
    }

    const unsubscribe = wsManager.on('notification', handler)
    return () => unsubscribe && unsubscribe()
  }, [wsManager])

  // =========================
  // MARK READ
  // =========================
  const handleMarkAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id)

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    )

    if (target && !target.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    try {
      await apiClient.markAdminNotificationAsRead(id)
    } catch {
      if (target && !target.is_read) {
        setUnreadCount((prev) => prev + 1)
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    )
    setUnreadCount(0)

    try {
      await apiClient.markAllAdminNotificationsRead()
    } catch {
      const fallbackUnread = notifications.filter((n) => !n.is_read).length
      setUnreadCount(fallbackUnread)
    }
  }

  // ── Routing ───────────────────────────────────────────────────────────────
  const handleNotificationClick = (id: string) => {
    const n = notifications.find((x) => x.id === id)
    if (!n) return

    handleMarkAsRead(id)

    // Special-case overrides (admin-specific logic)
    if (isReportedContentNotification(n)) {
      router.push('/admin/reports')
      return
    }

    if (isWarningNotification(n)) {
      if (n.entity_type && n.entity_id) {
        router.push(`/admin/users/${n.entity_id}`)
      } else {
        router.push('/admin/users')
      }
      return
    }

    // Delegate all remaining routing to the centralized admin registry
    router.push(
      resolveAdminNotificationRoute(
        n.entity_id ?? '',
        n.entity_type ?? '',
        n.type ?? '',
      ),
    )
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    const list =
      filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

    // Map admin Notification shape → NotificationList prop shape
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      user: n.user,
      message: n.message,
      createdAt: n.rawTimestamp,
      isRead: n.is_read,
    }))
  }, [notifications, filter])

  // =========================
  // UI
  // =========================
  return (
    <div className="p-6 overflow-y-auto min-h-screen bg-gray-50 text-white">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2 text-black">
                Notifications
              </h1>

              <p className="text-neutral-400">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : "You're all caught up!"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-black text-black hover:bg-neutral-100"
              >
                <CheckCheck className="w-5 h-5" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm border p-2 mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2.5 rounded-lg ${
              filter === 'all'
                ? 'bg-black text-white'
                : 'text-neutral-700'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2.5 rounded-lg ${
              filter === 'unread'
                ? 'bg-black text-white'
                : 'text-neutral-700'
            }`}
          >
            Unread ({unreadCount})
          </button>

          {/* Note: Mentions filter can be added in future when mention notifications are supported by backend */}
          {/* <button
            onClick={() => setFilter('mentions')}
            className={`flex-1 py-2.5 rounded-lg ${
              filter === 'mentions'
                ? 'bg-black text-white'
                : 'text-neutral-700'
            }`}
          >
            Mentions
          </button> */}
        </div>

        {/* LIST */}
        {error ? (
          <div className="py-10 text-center text-red-500 text-sm">{error}</div>
        ) : (
          <NotificationList
            notifications={filteredNotifications}
            loading={loading}
            onNotificationClick={handleNotificationClick}
          />
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <p className="text-sm text-neutral-600">
              Page {page} of {totalPages}
            </p>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg bg-white border border-neutral-300 text-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}