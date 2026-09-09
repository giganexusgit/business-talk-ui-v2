'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Briefcase, Check, MapPin, MessageCircle, UserPlus } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { useFollow } from '@/hooks/useFollow'
import BioText from '@/components/common/BioText'

export default function GroupRequestProfilePage() {
  const router = useRouter()
  const params = useParams()

  const groupId = params.id as string
  const requestId = params.requestId as string

  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [requestData, setRequestData] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [openingChat, setOpeningChat] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)

  const targetUserId = useMemo(
    () => requestData?.user?.id || requestData?.userId || '',
    [requestData]
  )

  const { state: followState, loading: followLoading, follow, unfollow } = useFollow(targetUserId)

  useEffect(() => {
    if (!groupId || !requestId) return

    const load = async () => {
      try {
        setLoading(true)

        const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        const currentUserId = currentUser?.id || ''

        const groupRes = await apiClient.getGroupById(groupId)
        const group = groupRes.data

        const ownerId = group.created_by || group.createdBy || group.owner?.id || ''
        const ownerByMemberRole = (group.members || []).some((m: any) => {
          const memberId = m.userId || m.user?.id || ''
          const role = String(m.role || '').toUpperCase()
          return memberId === currentUserId && role === 'OWNER'
        })

        const owner = Boolean(currentUserId && (ownerId === currentUserId || ownerByMemberRole))
        setIsOwner(owner)

        if (!owner) return

        const requestsRes = await apiClient.getGroupJoinRequests(groupId)
        const reqList = Array.isArray(requestsRes.data) ? requestsRes.data : []
        const req = reqList.find((r: any) => String(r.id) === String(requestId))

        if (!req) {
          setRequestData(null)
          return
        }

        setRequestData(req)

        const userId = req.user?.id || req.userId || ''
        if (!userId) return

        const userRes = await apiClient.getUserById(userId)
        const u = userRes.data

        setProfile({
          id: u.id,
          name: u.full_name || u.username || 'Unknown User',
          avatar: u.profile_photo,
          cover: u.cover_image,
          profession: u.profession,
          location: u.location,
          company: u.company,
          about: u.about || u.short_bio,
          email: u.email,
          phone_number: u.phone_number,
        })
      } catch (err) {
        console.error('Failed to load request profile', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [groupId, requestId])

  const handleMessage = async () => {
    if (!targetUserId) return
    try {
      setOpeningChat(true)
      const conv = await apiClient.getOrCreateConversation(targetUserId)
      if (conv.id) router.push(`/messages?conversationId=${conv.id}`)
      else router.push('/messages')
    } catch (err) {
      console.error('Open chat error', err)
      router.push('/messages')
    } finally {
      setOpeningChat(false)
    }
  }

  const handleApproveRequest = async () => {
    try {
      setApproving(true)
      await apiClient.approveGroupJoinRequest(requestId)
      setApproved(true)
    } catch (err) {
      console.error('Failed to approve request', err)
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading request details...</div>
  }

  if (!isOwner) {
    return (
      <div className="p-6 text-center" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
        <p className="font-semibold mb-2" style={{ color: '#212529' }}>Access Denied</p>
        <p className="text-sm mb-5" style={{ color: '#5F6368' }}>Only group owners can review join requests.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (!requestData) {
    return (
      <div className="p-6 text-center" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
        <p className="font-semibold mb-2" style={{ color: '#212529' }}>Request not found</p>
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm"
        >
          Back to Group
        </button>
      </div>
    )
  }

  const displayName = profile?.name || requestData?.user?.full_name || requestData?.user?.username || 'Unknown User'
  const displayAvatar =
    profile?.avatar ||
    requestData?.user?.profile_photo ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E8E8E8&color=212529&size=160`

  const profession = profile?.profession || requestData?.user?.profession || 'Professional'
  const location = profile?.location || requestData?.user?.location || 'N/A'

  return (
    <div className="p-6 overflow-y-auto" style={{ backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#212529' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E8E8E8')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Group
        </button>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6" style={{ border: '1px solid #E8E8E8' }}>
          <img
            src={profile?.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=F3F4F6&color=212529&size=1200x240`}
            alt="Cover"
            className="w-full h-40 object-cover"
          />

          <div className="px-6 pb-6">
            <div className="flex flex-wrap items-end gap-4 -mt-12">
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />

              <div className="flex-1 min-w-0 pt-12">
                <h1 className="text-2xl font-semibold truncate" style={{ color: '#212529' }}>{displayName}</h1>
                <p className="text-sm" style={{ color: '#5F6368' }}>{profession}</p>

                <div className="flex flex-wrap gap-4 text-xs mt-2" style={{ color: '#5F6368' }}>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{profile?.company || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={followState === 'connected' ? unfollow : follow}
                disabled={followLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-all active:scale-95 disabled:opacity-60"
                style={{ borderColor: '#212529', color: '#212529', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  {followLoading
                    ? 'Updating...'
                    : followState === 'connected'
                    ? 'Disconnect'
                    : followState === 'pending'
                    ? 'Connecting…'
                    : 'Connect'}
                </span>
              </button>

              <button
                onClick={handleMessage}
                disabled={openingChat}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-all active:scale-95 disabled:opacity-60"
                style={{ borderColor: '#212529', color: '#212529', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8F9FA')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  {openingChat ? 'Opening…' : 'Message'}
                </span>
              </button>

              <button
                onClick={handleApproveRequest}
                disabled={approving || approved}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-all active:scale-95 disabled:opacity-60"
                style={{
                  borderColor: approved ? '#16A34A' : '#212529',
                  color: approved ? '#16A34A' : '#212529',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!approved && !approving) {
                    e.currentTarget.style.backgroundColor = '#212529'
                    e.currentTarget.style.color = '#FFFFFF'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = approved ? '#16A34A' : '#212529'
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {approved ? 'Request Approved' : approving ? 'Approving...' : 'Accept / Approve Request'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ border: '1px solid #E8E8E8' }}>
          <h2 className="text-xl font-semibold mb-3" style={{ color: '#212529' }}>About</h2>
          <BioText content={profile?.about} fallback="No additional details available." />
        </div>
      </div>
    </div>
  )
}
