'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isGuest =
      typeof window !== 'undefined' &&
      !localStorage.getItem('user')

    if (isGuest) {
      setLoading(false)
      return
    }

    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await apiClient.getFollowSuggestions()
      setUsers(res.data || [])
    } catch (err) {
      console.error('Failed to fetch users', err)
    } finally {
      setLoading(false)
    }
  }

  const followUser = async (id: string) => {
    try {
      updateConnectionCacheOnFollow(queryClient, currentUserId, id)
      await apiClient.followUserById(id)

      // 🔥 instant UI update
      setUsers(prev => prev.filter(u => String(u.id) !== String(id)))
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
      setUsers(prev => prev.filter((item) => String(item.id) !== String(user.id)))
      dispatch(fetchNotifications({ force: true }))
      dispatch(fetchUnreadCount())
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
      setUsers(prev => prev.filter((item) => String(item.id) !== String(user.id)))
      dispatch(fetchNotifications({ force: true }))
      dispatch(fetchUnreadCount())
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
      setUsers(prev => prev.filter((item) => String(item.id) !== String(user.id)))
      dispatch(fetchNotifications({ force: true }))
      dispatch(fetchUnreadCount())
    } catch (err) {
      console.error('Cancel connection request failed', err)
    }
  }

  const unfollowUser = async (id: string) => {
    try {
      updateConnectionCacheOnDelete(queryClient, currentUserId, id)
      await apiClient.unfollowUserById(id)
      fetchUsers()
    } catch (err) {
      console.error('Unfollow failed', err)
    }
  }

  return { users, loading, followUser, unfollowUser, acceptConnectionRequest, deleteConnectionRequest, cancelConnectionRequest }
}