'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux'
import { fetchNotifications, fetchUnreadCount } from '@/redux/slices/notificationsSlice'
import {
  updateConnectionCacheOnAccept,
  updateConnectionCacheOnDelete,
  updateConnectionCacheOnFollow,
} from '@/hooks/useFollow'

export function useUsers() {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const currentUserId = useAppSelector((state) => String(state.auth?.user?.id || ''))

  const { data: users = [], isLoading: loading, refetch } = useQuery<any[]>({
    queryKey: ['people', currentUserId],
    queryFn: async () => {
      try {
        const res = await apiClient.getPeople({ limit: 100 })
        const rawData = res.data?.data || (Array.isArray(res.data) ? res.data : [])
        const list = Array.isArray(rawData) ? rawData : []
        return currentUserId ? list.filter((u: any) => String(u?.id) !== currentUserId) : list
      } catch (err) {
        console.warn('Failed to fetch people from /user/people, fallback to suggestions', err)
        const fallbackRes = await apiClient.getFollowSuggestions()
        const rawFallback = fallbackRes.data?.data || (Array.isArray(fallbackRes.data) ? fallbackRes.data : [])
        const list = Array.isArray(rawFallback) ? rawFallback : []
        return currentUserId ? list.filter((u: any) => String(u?.id) !== currentUserId) : list
      }
    },
    refetchInterval: 8000, // ⚡ Live background sync every 8 seconds
    refetchOnWindowFocus: true,
    staleTime: 3000,
  })

  const setUsersOptimistic = (updater: (prev: any[]) => any[]) => {
    queryClient.setQueryData(['people', currentUserId], (old: any[] | undefined) => {
      return updater(old || [])
    })
  }

  const followUser = async (id: string) => {
    try {
      updateConnectionCacheOnFollow(queryClient, currentUserId, id)
      await apiClient.followUserById(id)
      setUsersOptimistic((prev) => prev.filter((u) => String(u.id) !== String(id)))
      queryClient.invalidateQueries({ queryKey: ['people'] })
    } catch (err) {
      console.error('Follow failed', err)
      updateConnectionCacheOnDelete(queryClient, currentUserId, id)
    }
  }

  const getConnectionRequestId = (user: any) => {
    const id = user?.connection_request_id ?? user?.request_id ?? user?.requestId ?? user?.connection_id ?? user?.connectionId ?? user?.id
    return id ? String(id) : ''
  }

  const acceptConnectionRequest = async (user: any) => {
    const targetUserId = String(user?.id || user?.userId || '')
    const requestId = getConnectionRequestId(user)
    if (!requestId) return

    try {
      updateConnectionCacheOnAccept(queryClient, currentUserId, targetUserId)
      await apiClient.acceptConnectionRequest(requestId)
      setUsersOptimistic(prev => prev.filter((item) => String(item.id) !== String(user.id)))
      dispatch(fetchNotifications({ force: true }))
      dispatch(fetchUnreadCount())
      queryClient.invalidateQueries({ queryKey: ['people'] })
    } catch (err) {
      console.error('Accept connection request failed', err)
      updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
    }
  }

  const deleteConnectionRequest = async (user: any) => {
    const targetUserId = String(user?.id || user?.userId || '')
    const requestId = getConnectionRequestId(user)
    if (!requestId) return

    try {
      updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
      await apiClient.deleteConnectionRequest(requestId)
      setUsersOptimistic(prev => prev.filter((item) => String(item.id) !== String(user.id)))
      dispatch(fetchNotifications({ force: true }))
      dispatch(fetchUnreadCount())
      queryClient.invalidateQueries({ queryKey: ['people'] })
    } catch (err) {
      console.error('Delete connection request failed', err)
    }
  }

  const cancelConnectionRequest = async (user: any) => {
    const targetUserId = String(user?.id || user?.userId || '')
    const requestId = getConnectionRequestId(user)
    try {
      updateConnectionCacheOnDelete(queryClient, currentUserId, targetUserId)
      if (requestId && requestId !== targetUserId) {
        await apiClient.deleteConnectionRequest(requestId)
      } else if (targetUserId) {
        await apiClient.unfollowUserById(targetUserId)
      }
      setUsersOptimistic(prev => prev.filter((item) => String(item.id) !== String(user.id)))
      dispatch(fetchNotifications({ force: true }))
      dispatch(fetchUnreadCount())
      queryClient.invalidateQueries({ queryKey: ['people'] })
    } catch (err) {
      console.error('Cancel connection request failed', err)
    }
  }

  const unfollowUser = async (id: string) => {
    try {
      updateConnectionCacheOnDelete(queryClient, currentUserId, id)
      await apiClient.unfollowUserById(id)
      queryClient.invalidateQueries({ queryKey: ['people'] })
    } catch (err) {
      console.error('Unfollow failed', err)
    }
  }

  return { users, loading, refetch, followUser, unfollowUser, acceptConnectionRequest, deleteConnectionRequest, cancelConnectionRequest }
}