'use client'

import { CheckCheck, RefreshCw } from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  invalidateNotificationCache,
  removeNotification,
} from '@/redux/slices/notificationsSlice'
import apiClient from '@/lib/api-client'
import {
  selectAllNotifications,
  selectNotificationUnreadCount,
  selectNotificationsLoading,
  selectIsFetchingMore,
  selectHasMoreNotifications,
} from '@/redux/selectors/notificationSelectors'
import { useQueryClient } from '@tanstack/react-query'
import {
  updateConnectionCacheOnAccept,
  updateConnectionCacheOnDelete,
} from '@/hooks/useFollow'
import { NotificationList } from '@/components/notifications/NotificationList'
import { useRouter } from 'next/navigation'
import { resolveNotificationRoute } from '@/lib/notificationRegistry'
import type { NotificationEntity } from '@/types/notification'

export default function NotificationsPage() {
  // ── Pure UI state (filter only — all notification data lives in Redux) ──────
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const dispatch = useAppDispatch()
  const router = useRouter()

  // ── Redux state ────────────────────────────────────────────────────────────
  const notifications = useAppSelector(selectAllNotifications)
  const unreadCount = useAppSelector(selectNotificationUnreadCount)
  const isLoading = useAppSelector(selectNotificationsLoading)
  const isFetchingMore = useAppSelector(selectIsFetchingMore)
  const hasMore = useAppSelector(selectHasMoreNotifications)

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchNotifications())
  }, [dispatch])

  // ── Infinite scroll sentinel ───────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null)
  const paginationPage = useAppSelector((s) => s.notifications.pagination.page)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          dispatch(fetchNotifications({ page: paginationPage + 1 }))
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [dispatch, hasMore, isFetchingMore, paginationPage])

  // ── Force-refresh handler (cache invalidation) ────────────────────────────
  const handleRefresh = useCallback(() => {
    dispatch(invalidateNotificationCache())
    dispatch(fetchNotifications({ force: true }))
  }, [dispatch])

  // ── Mark read actions ─────────────────────────────────────────────────────
  const handleMarkAsRead = useCallback(
    (id: string) => {
      dispatch(markNotificationRead(id))
    },
    [dispatch],
  )

  const handleMarkAllAsRead = useCallback(() => {
    dispatch(markAllNotificationsRead())
  }, [dispatch])

  // ── Routing on click ─────────────────────────────────────────────────────
  const handleNotificationClick = useCallback(
    (id: string) => {
      const n = notifications.find((x: NotificationEntity) => x.id === id)
      if (!n) return

      handleMarkAsRead(id)
      router.push(resolveNotificationRoute(n))
    },
    [notifications, handleMarkAsRead, router],
  )

  const getConnectionRequestId = (n: NotificationEntity) => {
    const candidates = [
      (n as NotificationEntity & { requestId?: string }).requestId,
      (n as NotificationEntity & { connectionRequestId?: string }).connectionRequestId,
      (n as NotificationEntity & { request_id?: string }).request_id,
      (n as NotificationEntity & { connection_request_id?: string }).connection_request_id,
      n.entityId,
    ]

    return candidates.find((value): value is string => typeof value === 'string' && value.length > 0)
  }

  const isConnectionRequest = (n: NotificationEntity) => {
    const type = String(n.type || '').toLowerCase()
    const message = String(n.message || '').toLowerCase()

    return (
      type.includes('connection') ||
      type.includes('friend') ||
      type.includes('request') ||
      message.includes('connection') ||
      message.includes('connect')
    )
  }

  const queryClient = useQueryClient()
  const currentUserId = useAppSelector((state) => String(state.auth?.user?.id || ''))

  const handleConnectionRequestAction = useCallback(
    async (notificationId: string, requestId: string, action: 'accept' | 'delete') => {
      const n = notifications.find((x: NotificationEntity) => x.id === notificationId)
      const targetUserId = String(n?.actor?.id || '')
      try {
        if (action === 'accept') {
          updateConnectionCacheOnAccept(queryClient, currentUserId, targetUserId)
          await apiClient.acceptConnectionRequest(requestId)
        } else {
          updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
          await apiClient.deleteConnectionRequest(requestId)
        }

        dispatch(removeNotification(notificationId))
      } catch (err) {
        console.error(`Failed to ${action} connection request`, err)
        if (action === 'accept') {
          updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
        }
      }
    },
    [dispatch, notifications, queryClient, currentUserId],
  )

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    const list =
      filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications

    // Map NotificationEntity → NotificationList prop shape
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      user: { name: n.actor.name, avatar: n.actor.avatar },
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      requestId: getConnectionRequestId(n),
      canAct: isConnectionRequest(n),
    }))
  }, [notifications, filter])

  // ── UI ─────────────────────────────────────────────────────────────────────
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

            <div className="flex items-center gap-2">
              {/* Refresh / cache invalidation */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Refresh notifications"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

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
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm border p-2 mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2.5 rounded-lg ${
              filter === 'all' ? 'bg-black text-white' : 'text-neutral-700'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2.5 rounded-lg ${
              filter === 'unread' ? 'bg-black text-white' : 'text-neutral-700'
            }`}
          >
            Unread ({unreadCount})
          </button>

          {/* Note: Mentions filter reserved for future backend support */}
        </div>

        {/* NOTIFICATION LIST */}
        <NotificationList
          notifications={filteredNotifications}
          loading={isLoading}
          onNotificationClick={handleNotificationClick}
          onConnectionRequestAction={handleConnectionRequestAction}
        />

        {/* INFINITE SCROLL SENTINEL + load-more skeleton */}
        {hasMore && (
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {isFetchingMore && (
              <div className="flex gap-2 items-center text-sm text-neutral-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        )}

        {!hasMore && notifications.length > 0 && !isLoading && (
          <p className="text-center text-xs text-neutral-400 py-4">
            You've seen all notifications
          </p>
        )}
      </div>
    </div>
  )
}
