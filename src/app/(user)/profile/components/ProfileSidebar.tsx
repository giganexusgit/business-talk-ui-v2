'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { profileHref } from '@/lib/profile-link'
import { displayAvatarFromUser, displayNameFromUser, displayTitleFromUser } from '@/lib/business-profile'
import { Mail, Phone, Users, Newspaper, MessageSquare, TrendingUp, X, Loader2 } from 'lucide-react'
import apiClient from '@/lib/api-client'

type ListType = 'followers' | 'following' | null

interface UserItem {
  id: string
  username: string
  full_name?: string
  profile_photo?: string
  profession?: string
  account_type?: string
  business_name?: string
  business_logo?: string
  business_type?: string
  business_category?: string
}

function normaliseList(data: any): UserItem[] {
  const arr = Array.isArray(data) ? data : (data?.data ?? data?.followers ?? data?.following ?? [])
  return arr.map((item: any) => {
    // API may nest user under item.follower / item.following / item.user
    const u = item.follower ?? item.following ?? item.user ?? item
    return {
      id: u.id ?? u.userId ?? '',
      username: u.username ?? u.full_name ?? 'User',
      full_name: u.full_name,
      profile_photo: u.profile_photo,
      profession: u.profession,
      account_type: u.account_type,
      business_name: u.business_name,
      business_logo: u.business_logo,
      business_type: u.business_type,
      business_category: u.business_category,
    }
  }).filter((u: UserItem) => u.id)
}

function StatRow({
  icon, label, value, clickable, onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  clickable?: boolean
  onClick?: () => void
}) {
  if (clickable && onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-2 border-b last:border-b-0 group transition-colors"
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div className="flex items-center gap-2 text-sm text-gray-600 group-hover:text-[#1976D2] transition-colors">
          {icon}
          {label}
        </div>
        <span className="text-sm font-semibold text-gray-800 group-hover:text-[#1976D2] transition-colors underline-offset-2 group-hover:underline">
          {value}
        </span>
      </button>
    )
  }
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-gray-600">{icon}{label}</div>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}

export function ProfileSidebar({
  profile,
  userId,
  statsProp,
}: {
  profile: any
  userId?: string
  statsProp?: any
}) {
  const [stats, setStats] = useState<{
    followers: number
    posts: number
    comments: number
    engagement: number
    following: number
  } | null>(null)

  const [activeList, setActiveList] = useState<ListType>(null)
  const [listUsers, setListUsers] = useState<UserItem[]>([])
  const [listLoading, setListLoading] = useState(false)

  useEffect(() => {
    if (statsProp) {
      setStats({
        followers:  statsProp.followersCount  ?? statsProp.followers_count  ?? statsProp.followers  ?? 0,
        posts:      statsProp.postsCount      ?? statsProp.posts_count      ?? statsProp.posts      ?? 0,
        comments:   statsProp.commentsCount   ?? statsProp.comments_count   ?? statsProp.comments   ?? 0,
        engagement: statsProp.engagement      ?? 0,
        following:  statsProp.followingCount  ?? statsProp.following_count  ?? statsProp.following  ?? 0,
      })
      return
    }

    if (!userId) return

    const fetchStats = async () => {
      try {
        const res = await apiClient.getUserStats(userId)
        const d = res.data
        setStats({
          followers:  d.followersCount ?? d.followers_count ?? d.followers ?? 0,
          posts:      d.postsCount    ?? d.posts_count    ?? d.posts    ?? 0,
          comments:   d.commentsCount ?? d.comments_count ?? d.comments ?? 0,
          engagement: d.engagement    ?? 0,
          following:  d.followingCount ?? d.following_count ?? d.following ?? 0,
        })
      } catch {
        try {
          const res = await apiClient.getFollowers(userId!)
          const followingfilter = await apiClient.getFollowing(userId!)
          const following = Array.isArray(followingfilter.data) ? followingfilter.data.length : (followingfilter.data?.count ?? 0)
          const followers = Array.isArray(res.data) ? res.data.length : (res.data?.count ?? 0)
          setStats({ followers, posts: 0, comments: 0, engagement: 0, following })
        } catch { /* silent */ }
      }
    }

    fetchStats()
  }, [userId, statsProp])

  const handleListClick = async (type: ListType) => {
    if (!userId) return
    if (activeList === type) { setActiveList(null); return }

    setActiveList(type)
    setListUsers([])
    setListLoading(true)
    try {
      const res = type === 'followers'
        ? await apiClient.getFollowers(userId)
        : await apiClient.getFollowing(userId)
      setListUsers(normaliseList(res.data))
    } catch { setListUsers([]) }
    finally { setListLoading(false) }
  }

  return (
    <div className="space-y-6">

      {/* CONTACT */}
      <div className="bg-white p-6 rounded-2xl border">
        <h2 className="font-semibold mb-4">Contact</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex gap-2 items-center">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{profile.email || 'N/A'}</span>
          </div>
          <div className="flex gap-2 items-center">
            <Phone className="w-4 h-4 shrink-0" />
            <span>{profile.phone_number || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* STATS */}
      {stats && (
        <div className="bg-white p-6 rounded-2xl border">
          <h2 className="font-semibold mb-3">Stats</h2>
          <div>
            <StatRow
              icon={<Users className="w-4 h-4 text-blue-500" />}
              label="Followers"
              value={stats.followers}
              clickable={!!userId}
              onClick={() => handleListClick('followers')}
            />
            <StatRow
              icon={<Users className="w-4 h-4 text-indigo-500" />}
              label="Following"
              value={stats.following}
              clickable={!!userId}
              onClick={() => handleListClick('following')}
            />
            {stats.posts > 0 && (
              <StatRow icon={<Newspaper className="w-4 h-4 text-orange-400" />} label="Posts" value={stats.posts} />
            )}
            {stats.comments > 0 && (
              <StatRow icon={<MessageSquare className="w-4 h-4 text-teal-500" />} label="Comments" value={stats.comments} />
            )}
            {stats.engagement > 0 && (
              <StatRow icon={<TrendingUp className="w-4 h-4 text-purple-500" />} label="Engagement" value={stats.engagement} />
            )}
          </div>
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING LIST */}
      {activeList && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ border: '1px solid #E8E8E8' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
            <h3 className="font-semibold text-sm capitalize" style={{ color: '#212529' }}>
              {activeList === 'followers' ? 'Followers' : 'Following'}
            </h3>
            <button
              onClick={() => setActiveList(null)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: '#5F6368' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {listLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#5F6368' }} />
              </div>
            ) : listUsers.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#5F6368' }}>
                No {activeList} yet
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: '#F0F0F0' }}>
                {listUsers.map(u => (
                  <Link
                      key={u.id}
                      href={profileHref(u.id, displayNameFromUser(u) || u.username)}
                      className="flex items-center gap-3 px-5 py-3 transition-colors"
                      style={{ color: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                    <img
                      src={displayAvatarFromUser(u) || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayNameFromUser(u) || u.username)}&background=E8E8E8&color=212529&size=40`}
                      alt={displayNameFromUser(u) || u.username}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#212529' }}>
                        {displayNameFromUser(u) || u.username}
                      </p>
                      {displayTitleFromUser(u) && (
                        <p className="text-xs truncate" style={{ color: '#5F6368' }}>{displayTitleFromUser(u)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}