'use client'

import { useState, useEffect } from 'react'
import { ProfileHeader } from './ProfileHeader'
import { ProfileTabs } from './ProfileTabs'
import { ProfileAbout } from './ProfileAbout'
import { ProfileExperience } from './ProfileExperience'
import { ProfileEducation } from './ProfileEducation'
import { ProfileGallery } from './ProfileGallery'
import { ProfileSidebar } from './ProfileSidebar'
import { ProfileRecentActivity } from './ProfileRecentActivity'
import { useFollow } from '@/hooks/useFollow'

export function ProfileLayout({
  profile,
  userId,
  isOwnProfile,
  stats,
  activity,
  loadMoreActivity,
  loadingMoreActivity,
  hasMoreActivity,
}: {
  profile: any
  userId?: string
  isOwnProfile?: boolean
  stats?: any
  activity?: any

  loadMoreActivity?: () => void
  loadingMoreActivity?: boolean
  hasMoreActivity?: boolean
}) {
  const [activeTab, setActiveTab] = useState<
    'about' | 'experience' | 'education' | 'gallery'
  >(
    isOwnProfile
      ? 'about'
      : 'about'
  )

  useEffect(() => {
    if (
      !isOwnProfile &&
      activeTab === 'gallery'
    ) {
      setActiveTab('about')
    }
  }, [
    isOwnProfile,
    activeTab,
  ])

  const {
    state: followState,
    loading: followLoading,
    follow,
    unfollow,
    acceptConnection,
    deleteConnection,
    cancelConnection,
  } = useFollow(userId || '')

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-6xl mx-auto">

        <ProfileHeader
          profileData={profile}
          connectState={followState}
          loading={followLoading}
          onConnect={() => {
            if (followState === 'connected') {
              unfollow()
            } else if (followState === 'pending') {
              cancelConnection()
            } else {
              follow()
            }
          }}
          onAccept={acceptConnection}
          onDelete={deleteConnection}
          userId={userId || ''}
          isOwnProfile={
            !!isOwnProfile
          }
        />

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={
            setActiveTab
          }
          isOwnProfile={
            !!isOwnProfile
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 px-4 pb-8">

          <div className="lg:col-span-2 space-y-6">

            {activeTab ===
              'about' && (
              <>
                <ProfileAbout
                  profile={profile}
                />

                {userId && (
                  <ProfileRecentActivity
                    // userId={userId}
                    activity={
                      activity
                    }
                    loadMoreActivity={
                      loadMoreActivity
                    }
                    loadingMoreActivity={
                      loadingMoreActivity
                    }
                    hasMoreActivity={
                      hasMoreActivity
                    }
                  />
                )}
              </>
            )}

            {activeTab ===
              'experience' && (
              <ProfileExperience
                experiences={
                  profile?.experience
                }
              />
            )}

            {activeTab ===
              'education' && (
              <ProfileEducation
                educations={
                  profile?.education
                }
              />
            )}

            {activeTab ===
              'gallery' && (
              <ProfileGallery />
            )}

          </div>

          <ProfileSidebar
            profile={profile}
            userId={userId}
            statsProp={stats}
          />

        </div>
      </div>
    </div>
  )
}