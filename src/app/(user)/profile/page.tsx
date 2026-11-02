'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useRedux'
import { useProfile } from '@/hooks/useProfile'
import { ProfileLayout } from '@/app/(user)/profile/components/ProfileLayout'
import { publicProfileFromUser } from '@/lib/business-profile'

export default function MyProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    profile,
    stats,
    activity,
    loading: profileLoading,

    loadMoreActivity,
    loadingMoreActivity,
    hasMoreActivity,
  } = useProfile()

  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      const u = stored ? JSON.parse(stored) : null
      if (u?.id) {
        setUserId(u.id)
      } else if (!authLoading && !isAuthenticated) {
        router.replace('/login')
      }
    } catch {
      if (!authLoading && !isAuthenticated) {
        router.replace('/login')
      }
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-black rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading profile...</p>
      </div>
    )
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-700">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to view your profile
          </h1>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Please log in or create an account to view your profile, manage your business activity, and connect with others.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </Link>
            <Link
              href="/signup"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-50 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const normalized = publicProfileFromUser(profile)

  return (
    <ProfileLayout
      profile={normalized}
      userId={userId || profile.id}
      isOwnProfile={true}
      stats={stats}
      activity={activity}
      loadMoreActivity={loadMoreActivity}
      loadingMoreActivity={loadingMoreActivity}
      hasMoreActivity={hasMoreActivity}
    />
  )
}