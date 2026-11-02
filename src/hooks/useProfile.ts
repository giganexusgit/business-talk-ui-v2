'use client'

import {
  useEffect,
  useState,
  useCallback,
} from 'react'
import apiClient from '@/lib/api-client'

export function useProfile() {
  const [profile, setProfile] =
    useState<any>(null)

  const [stats, setStats] =
    useState<any>(null)

  const [activity, setActivity] =
    useState<any>(null)

  const [loading, setLoading] =
    useState(true)

  const [activityPage, setActivityPage] =
    useState(1)

  const [
    loadingMoreActivity,
    setLoadingMoreActivity,
  ] = useState(false)

  const [
    hasMoreActivity,
    setHasMoreActivity,
  ] = useState(true)

  const ACTIVITY_LIMIT = 10

  const fetchAll = useCallback(
    async () => {
      const isGuest =
        typeof window !==
          'undefined' &&
        !localStorage.getItem(
          'user'
        )

      if (isGuest) {
        setLoading(false)
        return
      }

      try {
        const [
          profileRes,
          statsRes,
          activityRes,
        ] = await Promise.all([
          apiClient.getMyProfileinfo(),
          apiClient.getDashboardStats(),
          apiClient.getUserActivity(
            1,
            ACTIVITY_LIMIT
          ),
        ])

        setProfile(
          profileRes.data
        )

        setStats(
          statsRes.data
        )

        setActivity(
          activityRes.data
        )

        // Reset pagination state
        setActivityPage(1)

        const pagination =
          activityRes.data?.pagination

        const maxPages = Math.max(
          pagination?.posts?.totalPages || 0,
          pagination?.comments?.totalPages || 0,
          pagination?.blogs?.totalPages || 0,
          pagination?.follows?.totalPages || 0
        )

        setHasMoreActivity(maxPages > 1)
      } catch (err) {
        console.error(
          'Profile fetch error:',
          err
        )
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadMoreActivity =
    async () => {
      if (
        loadingMoreActivity ||
        !hasMoreActivity
      ) {
        return
      }

      try {
        setLoadingMoreActivity(
          true
        )

        const nextPage =
          activityPage + 1

        const res =
          await apiClient.getUserActivity(
            nextPage,
            ACTIVITY_LIMIT
          )

        const newPosts =
          res.data
            ?.recentPosts || []

        const newComments =
          res.data
            ?.recentComments ||
          []

        const newBlogs =
          res.data
            ?.recentBlogPosts ||
          []

        const newFollows =
          res.data
            ?.recentFollows ||
          []

        const pagination =
          res.data?.pagination

        const maxPages = Math.max(
          pagination?.posts?.totalPages || 0,
          pagination?.comments?.totalPages || 0,
          pagination?.blogs?.totalPages || 0,
          pagination?.follows?.totalPages || 0
        )

        if (nextPage >= maxPages) {
          setHasMoreActivity(false)
        }

        setActivity(
          (prev: any) => ({
            ...prev,

            recentPosts: [
              ...(prev?.recentPosts ||
                []),
              ...newPosts,
            ],

            recentComments: [
              ...(prev?.recentComments ||
                []),
              ...newComments,
            ],

            recentFollows: [
              ...(prev?.recentFollows ||
                []),
              ...newFollows,
            ],

            recentBlogPosts: [
              ...(prev?.recentBlogPosts ||
                []),
              ...newBlogs,
            ],
          })
        )

        setActivityPage(
          nextPage
        )
        
      } catch (err) {
        console.error(
          'Load more activity error:',
          err
        )
      } finally {
        setLoadingMoreActivity(
          false
        )
      }
    }

  useEffect(() => {
    fetchAll()

    const onProfileUpdated = () => {
      fetchAll()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('profile-updated', onProfileUpdated)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('profile-updated', onProfileUpdated)
      }
    }
  }, [fetchAll])

  return {
    profile,
    stats,
    activity,
    loading,

    loadMoreActivity,
    loadingMoreActivity,
    hasMoreActivity,

    refetch: fetchAll,
  }
}