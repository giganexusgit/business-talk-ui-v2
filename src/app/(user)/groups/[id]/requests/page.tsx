'use client'

import { useParams, useRouter } from 'next/navigation'
import { profileHref } from '@/lib/profile-link'
import { ArrowLeft, Check, X, Users, Clock, UserPlus, MessageCircle } from 'lucide-react'
import {
  useGroupJoinRequests,
  useApproveJoinRequest,
  useRejectJoinRequest,
  useGroupById,
} from '@/hooks/useGroups'
import { useFollow } from '@/hooks/useFollow'
import apiClient from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'

// ── Per-request card with connect + message ──────────────────────────────────
function RequestCard({ req, approveMutation, rejectMutation, router }: {
  req: any
  approveMutation: any
  rejectMutation: any
  router: ReturnType<typeof useRouter>
}) {
  const requireAuth = useRequireAuth()
  const userId = req.user?.id || req.userId || ''
  const { state: followState, follow, unfollow } = useFollow(userId)
  const [messaging, setMessaging] = useState(false)

  const isApproving = approveMutation.isPending && approveMutation.variables === req.id
  const isRejecting = rejectMutation.isPending && rejectMutation.variables === req.id

  const displayName =
    req.user?.full_name || req.user?.username || req.user?.name || 'Unknown User'
  const avatarUrl =
    req.user?.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E8E8E8&color=212529&size=96`

  const handleMessage = async () => {
    if (!requireAuth()) return
    if (!userId) return
    try {
      setMessaging(true)
      const conv = await apiClient.getOrCreateConversation(userId)
      if (conv.id) router.push(`/messages?conversationId=${conv.id}`)
    } catch { /* ignore */ } finally { setMessaging(false) }
  }

  return (
    <div
      className="bg-white rounded-2xl border p-5"
      style={{ border: '1px solid #E8E8E8' }}
    >
      {/* Top row: avatar + info + approve/reject */}
      <div className="flex items-center gap-4">
        <img
          src={avatarUrl}
          alt={displayName}
          onClick={() => userId && router.push(profileHref(userId, displayName))}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        />

        <div className="flex-1 min-w-0">
          <p
            className="font-semibold cursor-pointer hover:underline"
            style={{ color: '#212529' }}
            onClick={() => userId && router.push(profileHref(userId, displayName))}
          >
            {displayName}
          </p>
          {req.user?.profession && (
            <p className="text-xs truncate" style={{ color: '#5F6368' }}>
              {req.user.profession}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#5F6368' }}>
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              {req.created_on
                ? new Date(Number(req.created_on) * (String(req.created_on).length <= 10 ? 1000 : 1)).toLocaleDateString(
                    undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Pending'}
            </span>
          </div>
        </div>

        {/* Approve / Reject */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              if (!requireAuth()) return
              rejectMutation.mutate(req.id)
            }}
            disabled={isRejecting || isApproving}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 disabled:opacity-50"
            style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#FFFFFF' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#DC2626' }}
          >
            <X className="w-4 h-4" />
            {isRejecting ? 'Rejecting…' : 'Reject'}
          </button>

          <button
            onClick={() => {
              if (!requireAuth()) return
              approveMutation.mutate(req.id)
            }}
            disabled={isApproving || isRejecting}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 disabled:opacity-50"
            style={{ borderColor: '#212529', color: '#212529', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#212529'; e.currentTarget.style.color = '#FFFFFF' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#212529' }}
          >
            <Check className="w-4 h-4" />
            {isApproving ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>

      {/* Bottom row: Connect + Message */}
      <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
        <button
          onClick={() => {
            if (!requireAuth()) return
            if (followState === 'connected') unfollow()
            else follow()
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 flex-1 justify-center"
          style={{ borderColor: '#212529', color: '#212529', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#212529'; e.currentTarget.style.color = '#FFFFFF' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#212529' }}
        >
          <UserPlus className="w-4 h-4" />
          {followState === 'connected' ? 'Disconnect' : followState === 'pending' ? 'Connecting…' : 'Connect'}
        </button>

        <button
          onClick={handleMessage}
          disabled={messaging}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 flex-1 justify-center disabled:opacity-60"
          style={{ borderColor: '#212529', color: '#212529', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#212529'; e.currentTarget.style.color = '#FFFFFF' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#212529' }}
        >
          <MessageCircle className="w-4 h-4" />
          {messaging ? 'Opening…' : 'Message'}
        </button>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function GroupRequestsPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  const [currentUserId, setCurrentUserId] = useState('')
  const [authResolved, setAuthResolved] = useState(false)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      setCurrentUserId(user.id || '')
    } catch {
      setCurrentUserId('')
    } finally {
      setAuthResolved(true)
    }
  }, [])

  const { data: groupData, isLoading: groupLoading } = useGroupById(groupId)

  const ownerId =
    groupData?.created_by ||
    groupData?.createdBy ||
    groupData?.owner?.id ||
    ''

  const isOwnerByMemberRole = Boolean(
    currentUserId &&
      (groupData?.members || []).some((m: any) => {
        const memberId = m.userId || m.user?.id || ''
        const memberRole = String(m.role || '').toUpperCase()
        return memberId === currentUserId && memberRole === 'OWNER'
      })
  )

  const isGroupOwner = Boolean(
    currentUserId && (ownerId === currentUserId || isOwnerByMemberRole)
  )

  const { data: requests = [], isLoading, error } = useGroupJoinRequests(groupId, isGroupOwner)
  const approveMutation = useApproveJoinRequest(groupId)
  const rejectMutation = useRejectJoinRequest(groupId)

  if (groupLoading || !authResolved || (isGroupOwner && isLoading)) {
    return (
      <div className="p-6" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
        <div className="max-w-2xl mx-auto">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border p-5 animate-pulse"
                style={{ border: '1px solid #E8E8E8' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!isGroupOwner) {
    return (
      <div
        className="p-6 text-center"
        style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}
      >
        <div className="max-w-2xl mx-auto mt-20">
          <p className="font-semibold mb-2" style={{ color: '#212529' }}>
            Access Denied
          </p>
          <p className="text-sm mb-6" style={{ color: '#5F6368' }}>
            Only group owners can view join requests.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-6 text-center"
        style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}
      >
        <div className="max-w-2xl mx-auto mt-20">
          <p className="font-semibold mb-2" style={{ color: '#212529' }}>
            Access Denied
          </p>
          <p className="text-sm mb-6" style={{ color: '#5F6368' }}>
            Only group admins can view join requests.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-6 overflow-y-auto"
      style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#212529' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E8E8E8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Group
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#212529' }}>
              Join Requests
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5F6368' }}>
              Review pending requests to join this group.
            </p>
          </div>
          {requests.length > 0 && (
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: '#212529', color: '#FFFFFF' }}
            >
              {requests.length} pending
            </span>
          )}
        </div>

        {/* Empty state */}
        {requests.length === 0 ? (
          <div
            className="bg-white rounded-2xl border p-16 text-center"
            style={{ border: '1px solid #E8E8E8' }}
          >
            <Users
              className="w-14 h-14 mx-auto mb-4"
              style={{ color: '#E8E8E8' }}
            />
            <p className="font-semibold text-lg mb-1" style={{ color: '#212529' }}>
              No pending requests
            </p>
            <p className="text-sm" style={{ color: '#5F6368' }}>
              All caught up! New join requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => (
              <RequestCard
                key={req.id}
                req={req}
                approveMutation={approveMutation}
                rejectMutation={rejectMutation}
                router={router}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
