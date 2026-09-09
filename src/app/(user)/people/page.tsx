'use client'

import Link from 'next/link'
import {
  Search,
  Users,
  Filter,
  MapPin,
  Briefcase,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useUsers } from '@/hooks/useUsers'
import { useFollow } from '@/hooks/useFollow'
import { useAppSelector } from '@/hooks/useRedux'
import { profileHref } from '@/lib/profile-link'

const categories = [
  'All',
  'Mutual',
  'In Your Industry',
]

function PeopleCard({
  user,
  onAcceptConnection,
  onDeleteConnection,
}: {
  user: any
  onAcceptConnection: (user: any) => Promise<void> | void
  onDeleteConnection: (user: any) => Promise<void> | void
}) {
  const currentUserId = useAppSelector((state) => String(state.auth?.user?.id || ''))
  const isPendingRequest = Boolean(
    user?.connection_request_id ||
    user?.request_id ||
    user?.requestId ||
    user?.connection_id ||
    user?.connectionId ||
    user?.connection_status === 'pending' ||
    user?.status === 'pending' ||
    user?.pending === true,
  )

  const {
    state: followState,
    loading: followLoading,
    actionState: followActionState,
    follow,
    unfollow,
    acceptConnection,
    deleteConnection,
    cancelConnection,
    isHydrated,
  } = useFollow(String(user.id || ''), isPendingRequest ? 'incoming' : undefined)

  const isSelf = currentUserId === String(user.id || '')
  const [actionState, setActionState] = useState<'idle' | 'accepting' | 'deleting'>('idle')
  const [isHovered, setIsHovered] = useState(false)

  const handleConnect = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isSelf || followLoading || !isHydrated) return

    if (followState === 'connected') {
      await unfollow()
    } else if (followState === 'pending') {
      await cancelConnection()
    } else if (followState === 'connect') {
      await follow()
    }
  }

  const handlePendingAction = async (action: 'accept' | 'delete', e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (actionState !== 'idle' || followLoading) return

    setActionState(action === 'accept' ? 'accepting' : 'deleting')
    try {
      if (action === 'accept') {
        await acceptConnection()
        await onAcceptConnection(user)
      } else {
        await deleteConnection()
        await onDeleteConnection(user)
      }
    } finally {
      setActionState('idle')
    }
  }

  const isProcessing = followLoading || actionState !== 'idle'

  const buttonLabel =
    !isHydrated ? 'Loading...' :
    followActionState === 'connecting' ? 'Connecting...' :
    followActionState === 'unfollowing' ? 'Removing...' :
    followState === 'connected' ? (isHovered ? 'Disconnect' : 'Connected') :
    followState === 'pending' ? (isHovered ? 'Cancel Request' : 'Requested') :
    'Connect'

  return (
    <Link
      href={profileHref(user.id, user.full_name)}
      className="block group"
    >
      <div className="bg-white rounded-2xl border p-6 transition hover:shadow-md hover:scale-[1.02]">

        {/* Avatar */}
        <div className="flex flex-col items-center text-center mb-4">
          <img
            src={user.profile_photo || `https://ui-avatars.com/api/name=${encodeURIComponent(user.full_name || 'User')}`}
            alt={user.full_name || 'User Avatar'}
            className="w-20 h-20 rounded-full object-cover mb-3 border"
          />

          <h3 className="font-semibold text-lg">
            {user.full_name}
          </h3>

          <p className="text-sm text-gray-500">
            {user.profession || 'Professional'}
          </p>

          {Number(user.mutual_count || 0) > 0 && (
            <div className="mt-2 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
              {user.mutual_count} mutual connection{user.mutual_count > 1 ? 's' : ''}
            </div>
          )}

          {user.same_industry && (
            <div className="mt-2 text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600">
              In your industry
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <MapPin className="w-3 h-3" />
            <span>{user.location || 'India'}</span>
          </div>
        </div>

        {/* Company */}
        {user.company && (
          <div className="text-center text-xs text-gray-500 mb-3">
            {user.company}
          </div>
        )}

        {/* Skills */}
        {user.skills && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {(Array.isArray(user.skills)
              ? user.skills
              : typeof user.skills === 'string'
              ? user.skills.split(',')
              : []
            )
              .slice(0, 3)
              .map((skill: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs rounded-full bg-[#F8F9FA]"
                >
                  {skill.trim()}
                </span>
              ))}
          </div>
        )}

        {/* Connection Actions */}
        {followState === 'incoming' ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handlePendingAction('accept', e)}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-green-600 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-60"
            >
              {actionState === 'accepting' || followActionState === 'accepting' ? 'Accepting...' : 'Accept'}
            </button>
            <button
              onClick={(e) => handlePendingAction('delete', e)}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-red-600 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              {actionState === 'deleting' || followActionState === 'deleting' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isSelf || !isHydrated || isProcessing}
            className={`w-full px-3 py-2 text-xs font-medium rounded-lg 
              transition-all duration-200 flex-shrink-0 border active:scale-95 cursor-pointer
              ${followState === 'connected'
                ? 'border-green-500 text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-700 hover:border-red-500'
                : followState === 'pending'
                ? 'border-amber-500 text-amber-700 bg-amber-50 hover:bg-red-50 hover:text-red-700 hover:border-red-500'
                : 'border-[#212529] text-[#212529] hover:bg-gray-100'
              }
              ${isSelf || !isHydrated || isProcessing
                ? 'opacity-70 cursor-not-allowed'
                : ''
              }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isSelf ? 'You' : buttonLabel}
          </button>
        )}

      </div>
    </Link>
  )
}

export default function PeoplePage() {
  const { users, loading, acceptConnectionRequest, deleteConnectionRequest } = useUsers()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [locationFilter, setLocationFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [appliedLocation, setAppliedLocation] = useState('')
  const [appliedCompany, setAppliedCompany] = useState('')

  const handleApplyFilter = () => {
    setAppliedLocation(locationFilter)
    setAppliedCompany(companyFilter)
  }

  const handleClearFilter = () => {
    setLocationFilter('')
    setCompanyFilter('')
    setAppliedLocation('')
    setAppliedCompany('')
    setSearchQuery('')
    setSelectedCategory('All')
  }

  // 🔥 Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      `${u.full_name || ''} ${u.profession || ''} ${u.company || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Mutual'
        ? Number(u.mutual_count || 0) > 0
        : selectedCategory === 'In Your Industry'
        ? u.same_industry === true
        : true;

    const matchesLocation = !appliedLocation.trim() ||
      String(u.location || '').toLowerCase().includes(appliedLocation.toLowerCase().trim())

    const matchesCompany = !appliedCompany.trim() ||
      `${u.company || ''} ${u.profession || ''}`.toLowerCase().includes(appliedCompany.toLowerCase().trim())

    return matchesSearch && matchesCategory && matchesLocation && matchesCompany;
  });

  if (loading) return <div className="p-6">Loading users...</div>

  const isFilterActive = Boolean(appliedLocation || appliedCompany || searchQuery || selectedCategory !== 'All')

  return (
    <div className="p-6 overflow-y-auto" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: '#212529' }}>
            Discover People
          </h1>
          <p style={{ color: '#5F6368' }}>
            Connect with professionals and expand your network
          </p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6" style={{ border: '1px solid #E8E8E8' }}>
          <div className="flex flex-col md:flex-row gap-4">

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, title, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border bg-[#F8F9FA]"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-6 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                showFilterPanel || isFilterActive
                  ? 'border-[#212529] bg-[#212529] text-white'
                  : 'border-gray-200 text-gray-700 hover:bg-[#F8F9FA]'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              {isFilterActive && <span className="h-2 w-2 rounded-full bg-blue-400" />}
            </button>
          </div>

          {/* Filter Panel (Expandable) */}
          {showFilterPanel && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Profession</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by company or role..."
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  onClick={handleApplyFilter}
                  className="flex-1 py-2 px-4 rounded-lg bg-[#212529] text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Apply Filter
                </button>
                <button
                  onClick={handleClearFilter}
                  className="py-2 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                style={{
                  backgroundColor: selectedCategory === category ? '#212529' : '#F8F9FA',
                  color: selectedCategory === category ? '#FFF' : '#5F6368',
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border flex gap-4">
            <Users className="w-6 h-6" />
            <div>
              <p className="text-xl font-semibold">{filteredUsers.length}</p>
              <p className="text-sm text-gray-500">People to discover</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border flex gap-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-xl font-semibold">
                {
                  filteredUsers.filter(
                    (u) => Number(u.mutual_count || 0) > 0
                  ).length
                }
              </p>
              <p className="text-sm text-gray-500">Mutual connections</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border flex gap-4">
            <Briefcase className="w-6 h-6 text-purple-600" />
            <div>
              <p className="text-xl font-semibold">
                {
                  filteredUsers.filter(
                    (u) => u.same_industry === true
                  ).length
                }
              </p>
              <p className="text-sm text-gray-500">In your industry</p>
            </div>
          </div>
        </div>

        {/* People Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredUsers.map((user) => (
            <PeopleCard
              key={user.id}
              user={user}
              onAcceptConnection={acceptConnectionRequest}
              onDeleteConnection={deleteConnectionRequest}
            />
          ))}

        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <button className="px-8 py-3 border rounded-xl text-gray-500 hover:bg-[#F8F9FA]">
            Load More People
          </button>
        </div>

      </div>
    </div>
  )
}