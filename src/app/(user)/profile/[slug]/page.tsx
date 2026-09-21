'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import apiClient from '@/lib/api-client'
import { ProfileLayout } from '../components/ProfileLayout'
import { useAppSelector } from '@/hooks/useRedux'
import { publicProfileFromUser } from '@/lib/business-profile'

function parseIdFromSlug(slug?: string) {
  if (!slug) return ''

  const uuidMatch = slug.match(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  )

  if (uuidMatch) return uuidMatch[0]

  const firstPart = slug.includes('-')
    ? slug.split('-')[0]
    : slug

  if (/^\d+$/.test(firstPart)) {
    return firstPart
  }

  return firstPart
}

export default function UserProfilePage() {
  const params = useParams()

  const slug = params.slug as string

  const id = parseIdFromSlug(slug)

  const [profile, setProfile] = useState<any>(null)
  const [activity, setActivity] = useState<any>(null)
  // const [stats] = useState<any>(null)

  const [activityPage, setActivityPage] = useState(1)

  const [loadingMoreActivity, setLoadingMoreActivity] =
    useState(false)

  const [hasMoreActivity, setHasMoreActivity] =
    useState(true)

  const currentUserId = useAppSelector((state) =>
    String(state.auth?.user?.id || '')
  )

  const isOwnProfile =
    currentUserId !== '' &&
    currentUserId === String(id)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const [profileRes, activityRes] =
          await Promise.all([
            apiClient.getUserById(id),
            apiClient.getUserActivityById(
              id,
              1,
              10
            ),
          ])

        const p = profileRes.data

        setProfile(publicProfileFromUser(p))

        setActivity(activityRes.data)

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
        console.error(err)
      }
    }

    fetchData()
  }, [id])

  const loadMoreActivity = async () => {
    if (
      loadingMoreActivity ||
      !hasMoreActivity
    ) {
      return
    }

    try {
      setLoadingMoreActivity(true)

      const nextPage = activityPage + 1

      const res =
        await apiClient.getUserActivityById(
          id,
          nextPage,
          10
        )

      const newPosts =
        res.data?.recentPosts || []

      const newComments =
        res.data?.recentComments || []

      const newBlogs =
        res.data?.recentBlogPosts || []

      const newFollows =
        res.data?.recentFollows || []

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

      setActivity((prev: any) => ({
        ...prev,

        recentPosts: [
          ...(prev?.recentPosts || []),
          ...newPosts,
        ],

        recentComments: [
          ...(prev?.recentComments || []),
          ...newComments,
        ],

        recentBlogPosts: [
          ...(prev?.recentBlogPosts || []),
          ...newBlogs,
        ],

        recentFollows: [
          ...(prev?.recentFollows || []),
          ...newFollows,
        ],
      }))

      setActivityPage(nextPage)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMoreActivity(false)
    }
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <ProfileLayout
      profile={profile}
      userId={id as string}
      isOwnProfile={isOwnProfile}
      // stats={stats}
      activity={activity}
      loadMoreActivity={loadMoreActivity}
      loadingMoreActivity={
        loadingMoreActivity
      }
      hasMoreActivity={
        hasMoreActivity
      }
    />
  )
}