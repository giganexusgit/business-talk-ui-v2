import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux'
import { fetchNotifications, fetchUnreadCount } from '@/redux/slices/notificationsSlice'
import { useRequireAuth } from './useRequireAuth'

export type ConnectionStatus = 'connect' | 'pending' | 'incoming' | 'connected'
export type ConnectionActionState = 'idle' | 'connecting' | 'accepting' | 'deleting' | 'unfollowing'

// ── Cache Update Helpers ──────────────────────────────────────────────────
export const updateConnectionCacheOnAccept = (
  queryClient: QueryClient,
  currentUserId: string,
  targetUserId: string,
) => {
  if (!currentUserId || !targetUserId) return
  queryClient.setQueryData(['my-following', currentUserId], (prev: string[] | undefined) => {
    const list = Array.isArray(prev) ? prev : []
    return list.includes(targetUserId) ? list : [...list, targetUserId]
  })
  queryClient.setQueryData(['pending-outgoing', currentUserId], (prev: string[] | undefined) =>
    (Array.isArray(prev) ? prev : []).filter((id) => id !== targetUserId),
  )
  queryClient.setQueryData(['incoming-requests', currentUserId], (prev: Record<string, string> | undefined) => {
    if (!prev) return {}
    const next = { ...prev }
    delete next[targetUserId]
    return next
  })
}

export const updateConnectionCacheOnDelete = (
  queryClient: QueryClient,
  currentUserId: string,
  targetUserId: string,
) => {
  if (!currentUserId || !targetUserId) return
  queryClient.setQueryData(['my-following', currentUserId], (prev: string[] | undefined) =>
    (Array.isArray(prev) ? prev : []).filter((id) => id !== targetUserId),
  )
  queryClient.setQueryData(['pending-outgoing', currentUserId], (prev: string[] | undefined) =>
    (Array.isArray(prev) ? prev : []).filter((id) => id !== targetUserId),
  )
  queryClient.setQueryData(['incoming-requests', currentUserId], (prev: Record<string, string> | undefined) => {
    if (!prev) return {}
    const next = { ...prev }
    delete next[targetUserId]
    return next
  })
}

export const updateConnectionCacheOnFollow = (
  queryClient: QueryClient,
  currentUserId: string,
  targetUserId: string,
) => {
  if (!currentUserId || !targetUserId) return
  queryClient.setQueryData(['pending-outgoing', currentUserId], (prev: string[] | undefined) => {
    const list = Array.isArray(prev) ? prev : []
    return list.includes(targetUserId) ? list : [...list, targetUserId]
  })
}

export function useFollow(targetUserId: string, initialStatus?: ConnectionStatus) {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const currentUserId = useAppSelector((state) => String(state.auth?.user?.id || ''))
  const [actionState, setActionState] = useState<ConnectionActionState>('idle')
  const [error, setError] = useState<string | null>(null)
  const requireAuth = useRequireAuth()

  const followingQueryKey = useMemo(() => ['my-following', currentUserId], [currentUserId])
  const pendingOutgoingQueryKey = useMemo(() => ['pending-outgoing', currentUserId], [currentUserId])
  const incomingRequestsQueryKey = useMemo(() => ['incoming-requests', currentUserId], [currentUserId])

  const isUUID = (id: string) => Boolean(id && id.length > 5)

  // 1. Connected Users (Following)
  const { data: followingIds } = useQuery<string[]>({
    queryKey: followingQueryKey,
    queryFn: async () => {
      if (!currentUserId) return []
      const res = await apiClient.getFollowing(currentUserId)
      const arr = Array.isArray(res.data)
        ? res.data
        : (res.data?.data ?? res.data?.following ?? [])
      return arr
        .map((item: any) => {
          const u = item.following ?? item.user ?? item
          return String(u.id || u.userId || '')
        })
        .filter(Boolean)
    },
    enabled: !!currentUserId && !!targetUserId,
    staleTime: 5 * 60 * 1000,
  })

  // 2. Pending Outgoing Requests
  const { data: pendingOutgoingIds } = useQuery<string[]>({
    queryKey: pendingOutgoingQueryKey,
    queryFn: async () => [],
    enabled: !!currentUserId && !!targetUserId,
    staleTime: 5 * 60 * 1000,
  })

  // 3. Incoming Requests Map (targetUserId -> requestId)
  const { data: incomingRequests } = useQuery<Record<string, string>>({
    queryKey: incomingRequestsQueryKey,
    queryFn: async () => ({}),
    enabled: !!currentUserId && !!targetUserId,
    staleTime: 5 * 60 * 1000,
  })

  // Computed state derived from shared caches
  const state: ConnectionStatus = useMemo(() => {
    if (!targetUserId) return 'connect'
    const id = String(targetUserId)
    if (followingIds?.includes(id)) return 'connected'
    if (pendingOutgoingIds?.includes(id)) return 'pending'
    if (incomingRequests && id in incomingRequests) return 'incoming'
    return initialStatus || 'connect'
  }, [followingIds, pendingOutgoingIds, incomingRequests, targetUserId, initialStatus])

  const follow = useCallback(async () => {
    if (!requireAuth()) return
    if (!isUUID(targetUserId) || actionState !== 'idle') return

    setError(null)
    setActionState('connecting')
    updateConnectionCacheOnFollow(queryClient, currentUserId, targetUserId)

    try {
      await apiClient.followUserById(targetUserId)
    } catch (err: any) {
      console.error('Follow error:', err)
      setError(err?.response?.data?.message || 'Failed to send connection request')
      // Revert on error
      updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
    } finally {
      setActionState('idle')
    }
  }, [requireAuth, targetUserId, actionState, queryClient, currentUserId])

  const unfollow = useCallback(async () => {
    if (!requireAuth()) return
    if (!targetUserId || actionState !== 'idle') return

    setError(null)
    setActionState('unfollowing')
    const prevFollowing = queryClient.getQueryData<string[]>(followingQueryKey)
    updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)

    try {
      await apiClient.unfollowUserById(targetUserId)
    } catch (err: any) {
      console.error('Unfollow error:', err)
      setError(err?.response?.data?.message || 'Failed to remove connection')
      if (prevFollowing) queryClient.setQueryData(followingQueryKey, prevFollowing)
    } finally {
      setActionState('idle')
    }
  }, [requireAuth, targetUserId, actionState, queryClient, currentUserId, followingQueryKey])

  const acceptConnection = useCallback(
    async (requestIdParam?: string) => {
      if (!requireAuth()) return
      if (!targetUserId || actionState !== 'idle') return

      const reqId = requestIdParam || incomingRequests?.[targetUserId] || targetUserId
      setError(null)
      setActionState('accepting')

      updateConnectionCacheOnAccept(queryClient, currentUserId, targetUserId)

      try {
        await apiClient.acceptConnectionRequest(reqId)
        dispatch(fetchNotifications({ force: true }))
        dispatch(fetchUnreadCount())
      } catch (err: any) {
        console.error('Accept connection error:', err)
        setError(err?.response?.data?.message || 'Failed to accept connection request')
        updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
      } finally {
        setActionState('idle')
      }
    },
    [requireAuth, targetUserId, actionState, incomingRequests, queryClient, currentUserId, dispatch],
  )

  const deleteConnection = useCallback(
    async (requestIdParam?: string) => {
      if (!requireAuth()) return
      if (!targetUserId || actionState !== 'idle') return

      const reqId = requestIdParam || incomingRequests?.[targetUserId] || targetUserId
      setError(null)
      setActionState('deleting')

      updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)

      try {
        await apiClient.deleteConnectionRequest(reqId)
        dispatch(fetchNotifications({ force: true }))
        dispatch(fetchUnreadCount())
      } catch (err: any) {
        console.error('Delete connection error:', err)
        setError(err?.response?.data?.message || 'Failed to delete connection request')
      } finally {
        setActionState('idle')
      }
    },
    [requireAuth, targetUserId, actionState, incomingRequests, queryClient, currentUserId, dispatch],
  )

  const cancelConnection = useCallback(
    async (requestIdParam?: string) => {
      if (!requireAuth()) return
      if (!targetUserId || actionState !== 'idle') return

      const reqId = requestIdParam || targetUserId
      setError(null)
      setActionState('deleting')

      updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)

      try {
        if (reqId && reqId !== targetUserId) {
          await apiClient.deleteConnectionRequest(reqId)
        } else {
          await apiClient.unfollowUserById(targetUserId)
        }
        dispatch(fetchNotifications({ force: true }))
        dispatch(fetchUnreadCount())
      } catch (err: any) {
        console.error('Cancel connection request error:', err)
        setError(err?.response?.data?.message || 'Failed to cancel connection request')
      } finally {
        setActionState('idle')
      }
    },
    [requireAuth, targetUserId, actionState, queryClient, currentUserId, dispatch],
  )

  return {
    state,
    loading: actionState !== 'idle',
    actionState,
    error,
    follow,
    unfollow,
    acceptConnection,
    deleteConnection,
    cancelConnection,
    isHydrated: followingIds !== undefined,
  }
}