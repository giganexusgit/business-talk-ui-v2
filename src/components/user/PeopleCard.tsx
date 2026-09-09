import Link from 'next/link'
import { profileHref } from '@/lib/profile-link'
import { MapPin } from 'lucide-react'
import { useFollow } from '@/hooks/useFollow'
import { useAppSelector } from '@/hooks/useRedux'
import { useState } from 'react'

export default function PeopleCard({ user }: { user: any }) {
  const currentUserId = useAppSelector((state) => String(state.auth?.user?.id || ''))
  const isPendingProp = Boolean(
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
    actionState,
    follow,
    unfollow,
    acceptConnection,
    deleteConnection,
    cancelConnection,
    isHydrated,
  } = useFollow(String(user.id || ''), isPendingProp ? 'incoming' : undefined)

  const isSelf = currentUserId === String(user.id || '')
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
    if (followLoading) return

    if (action === 'accept') {
      await acceptConnection()
    } else {
      await deleteConnection()
    }
  }

  const buttonLabel =
    !isHydrated ? 'Loading...' :
    actionState === 'connecting' ? 'Connecting...' :
    actionState === 'unfollowing' ? 'Removing...' :
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

        {/* Action Buttons */}
        {followState === 'incoming' ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handlePendingAction('accept', e)}
              disabled={followLoading}
              className="flex-1 rounded-lg border border-green-600 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-60"
            >
              {actionState === 'accepting' ? 'Accepting...' : 'Accept'}
            </button>
            <button
              onClick={(e) => handlePendingAction('delete', e)}
              disabled={followLoading}
              className="flex-1 rounded-lg border border-red-600 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              {actionState === 'deleting' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isSelf || !isHydrated || followLoading}
            className={`w-full px-3 py-2 text-xs font-medium rounded-lg 
              transition-all duration-200 flex-shrink-0 border active:scale-95 cursor-pointer
              ${followState === 'connected'
                ? 'border-green-500 text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-700 hover:border-red-500'
                : followState === 'pending'
                ? 'border-amber-500 text-amber-700 bg-amber-50 hover:bg-red-50 hover:text-red-700 hover:border-red-500'
                : 'border-[#212529] text-[#212529] hover:bg-gray-100'
              }
              ${isSelf || !isHydrated || followLoading
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