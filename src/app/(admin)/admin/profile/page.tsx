'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { ProfileLayout } from '@/app/(user)/profile/components/ProfileLayout'
import { publicProfileFromUser } from '@/lib/business-profile'

export default function MyProfilePage() {
  const { profile, stats, activity, loading } = useProfile()
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      if (u?.id) setUserId(u.id)
    } catch {
      // ignore
    }
  }, [])

  if (loading) return <div>Loading...</div>
  if (!profile) return <div>No profile</div>

  const normalized = publicProfileFromUser(profile)

  return (
    <ProfileLayout
      profile={normalized}
      userId={userId || profile.id}
      isOwnProfile={true}
      stats={stats}
      activity={activity}
    />
  )
}