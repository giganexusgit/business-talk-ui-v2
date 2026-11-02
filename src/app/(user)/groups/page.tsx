'use client'

import { Search, Users, Lock, Globe, TrendingUp, Plus } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import apiClient from '@/lib/api-client'
import { validateImageFile } from '@/lib/utils'
import { useRequireAuth } from '@/hooks/useRequireAuth'

interface Group {
  id: string
  name: string
  description: string
  image: string
  members: number
  posts: number
  type: 'public' | 'private'
  requiresApproval: boolean
  joined: boolean
  requested: boolean
  category: string
}

export default function GroupsPage() {
  const router = useRouter()
  const requireAuth = useRequireAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'my-groups' | 'requested'>('all')
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [requestedGroups, setRequestedGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [noSuggestions, setNoSuggestions] = useState(false)

  const [newGroup, setNewGroup] = useState<{
    name: string
    description: string
    visibility: 'PUBLIC' | 'PRIVATE'
    cover_image: string | File
    rules: string[]
  }>({
    name: '',
    description: '',
    visibility: 'PUBLIC',
    cover_image: '',
    rules: [],
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [ruleInput, setRuleInput] = useState('')

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const [allSettled, suggestedSettled, mySettled, requestedSettled] = await Promise.allSettled([
          apiClient.getGroups(),
          apiClient.getGroupSuggestions(20),
          apiClient.getMyGroups(),
          apiClient.getMyRequestedGroups(),
        ])

        const safeVal = (r: PromiseSettledResult<any>) =>
          r.status === 'fulfilled' ? r.value : { data: [] }

        const allRes = safeVal(allSettled)
        const suggestedRes = safeVal(suggestedSettled)
        const myRes = safeVal(mySettled)
        const requestedRes = safeVal(requestedSettled)

        const formatGroup = (g: any, joined = false, requested = false): Group => ({
          id: g.id,
          name: g.name,
          description: g.description,
          image: g.cover_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name || 'Group')}`,
          members: g.memberCount || 0,
          posts: g.postCount,
          type: g.visibility === 'PRIVATE' ? 'private' : 'public',
          requiresApproval: Boolean(g.requiresApproval) || g.visibility === 'PRIVATE',
          joined: joined || g.isJoined || false,
          requested: requested || g.isRequested || g.hasPendingRequest || false,
          category: 'General',
        })

        const myData: Group[] = (myRes.data || []).map((item: any) => {
          // API returns { group: {...}, role, joinedAt } or flat group object
          const g = item.group ?? item
          return formatGroup(g, true)
        })

        const myIds = new Set(myData.map(g => g.id))

        // Requested groups — API returns { group, requestId, requestStatus, requestedAt } or flat
        const reqData: Group[] = (requestedRes.data || []).map((item: any) => {
          const g = item.group ?? item
          return formatGroup(g, false, true)
        })

        setRequestedGroups(reqData)
        const requestedIds = new Set(reqData.map(g => g.id))

        const suggestedData: Group[] = (suggestedRes.data || []).map((g: any) =>
          formatGroup(g, false, Boolean(g.hasPendingRequest) || requestedIds.has(g.id))
        )

        const hasSuggestedGroups = suggestedData.length > 0
        setNoSuggestions(!hasSuggestedGroups)

        const discoverMap = new Map<string, Group>()
        suggestedData.forEach((group) => {
          discoverMap.set(group.id, group)
        })

        const allData: Group[] = (allRes.data || []).map((g: any) =>
          formatGroup(g, myIds.has(g.id), requestedIds.has(g.id))
        )

        // Always merge ALL groups (not just non-joined) so the discover tab is never blank
        allData.forEach((group) => {
          const existing = discoverMap.get(group.id)
          if (existing) {
            discoverMap.set(group.id, {
              ...group,
              requested: existing.requested || group.requested,
              requiresApproval: existing.requiresApproval || group.requiresApproval,
            })
          } else {
            discoverMap.set(group.id, group)
          }
        })

        setGroups(Array.from(discoverMap.values()))
        setMyGroups(myData)
      } catch (err) {
        console.error('Groups fetch error', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return

    try {
      const formData = new FormData()

      formData.append('name', newGroup.name.trim())
      formData.append('description', newGroup.description.trim())
      formData.append('visibility', newGroup.visibility)

      if (newGroup.cover_image instanceof File) {
        formData.append('cover_image', newGroup.cover_image)
      }

      newGroup.rules.forEach(rule => formData.append('rules', rule))

      const res = await apiClient.createGroup(formData)

      const g = res.data

      const formatted: Group = {
        id: g.id,
        name: g.name,
        description: g.description,
        image: g.cover_image || '/placeholder.jpg',
        members: 1,
        posts: 0,
        type: g.visibility === 'PRIVATE' ? 'private' : 'public',
        requiresApproval: Boolean(g.requiresApproval) || g.visibility === 'PRIVATE',
        joined: true,
        requested: false,
        category: 'General',
      }

      setGroups(prev => [formatted, ...prev])
      setMyGroups(prev => [formatted, ...prev])
      setShowCreateModal(false)
      setShowAdvanced(false)
      setRuleInput('')
      setNewGroup({ name: '', description: '', visibility: 'PUBLIC', cover_image: '', rules: [] })

    } catch (err) {
      console.error('Create group error', err)
    }
  }

  const handleJoinToggle = async (groupId: string) => {
    if (!requireAuth()) return
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    try {
      if (group.joined) {
        await apiClient.leaveGroup(groupId)
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, joined: false } : g))
        setMyGroups(prev => prev.filter(g => g.id !== groupId))
      } else if (group.requested) {
        // request already pending — no cancel endpoint; do nothing
        return
      } else if (group.requiresApproval) {
        await apiClient.requestToJoinGroup(groupId)
        const updated = { ...group, requested: true }
        setGroups(prev => prev.map(g => g.id === groupId ? updated : g))
        setRequestedGroups(prev => [...prev, updated])
      } else {
        await apiClient.joinGroup(groupId)
        const updated = { ...group, joined: true }
        setGroups(prev => prev.map(g => g.id === groupId ? updated : g))
        setMyGroups(prev => [...prev, updated])
      }
    } catch (err) {
      console.error('Join/Leave error', err)
    }
  }

  if (loading) {
    return <div className="p-6">Loading groups...</div>
  }

  const handleGroupClick = (group: Group) => {
    router.push(`/groups/${group.id}`)
  }

  const filteredGroups = (() => {
    const query = searchQuery.toLowerCase()
    if (activeTab === 'my-groups') return myGroups.filter(g => g.name.toLowerCase().includes(query))
    if (activeTab === 'requested') return requestedGroups.filter(g => g.name.toLowerCase().includes(query))
    return groups.filter(g => g.name.toLowerCase().includes(query))
  })()

  return (
    <div className="p-3 sm:p-6 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: '#212529' }}>
            Groups
          </h1>
          <p style={{ color: '#5F6368' }}>Join professional communities and expand your network</p>
        </div>

        {/* Tabs & Search */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-6" style={{ border: '1px solid #E8E8E8' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex gap-2 min-w-0">
              <button
                onClick={() => setActiveTab('all')}
                className="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base transition-all"
                style={{
                  backgroundColor: activeTab === 'all' ? '#212529' : '#F8F9FA',
                  color: activeTab === 'all' ? '#FFFFFF' : '#5F6368',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'all') {
                    e.currentTarget.style.backgroundColor = '#E8E8E8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'all') {
                    e.currentTarget.style.backgroundColor = '#F8F9FA'
                  }
                }}
              >
                <span className="block truncate">Discover Groups</span>
              </button>
              <button
                onClick={() => {
                  if (!requireAuth()) return
                  setActiveTab('my-groups')
                }}
                className="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base transition-all"
                style={{
                  backgroundColor: activeTab === 'my-groups' ? '#212529' : '#F8F9FA',
                  color: activeTab === 'my-groups' ? '#FFFFFF' : '#5F6368',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'my-groups') {
                    e.currentTarget.style.backgroundColor = '#E8E8E8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'my-groups') {
                    e.currentTarget.style.backgroundColor = '#F8F9FA'
                  }
                }}
              >
                <span className="block truncate">My Groups</span>
              </button>
              <button
                onClick={() => {
                  if (!requireAuth()) return
                  setActiveTab('requested')
                }}
                className="flex-1 min-w-0 px-2 sm:px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-1"
                style={{
                  backgroundColor: activeTab === 'requested' ? '#212529' : '#F8F9FA',
                  color: activeTab === 'requested' ? '#FFFFFF' : '#5F6368',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'requested') {
                    e.currentTarget.style.backgroundColor = '#E8E8E8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'requested') {
                    e.currentTarget.style.backgroundColor = '#F8F9FA'
                  }
                }}
              >
                <span className="truncate">Requested</span>
                {requestedGroups.length > 0 && (
                  <span
                    className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none shrink-0"
                    style={{
                      backgroundColor: activeTab === 'requested' ? 'rgba(255,255,255,0.25)' : '#E8E8E8',
                      color: activeTab === 'requested' ? '#FFFFFF' : '#5F6368',
                    }}
                  >
                    {requestedGroups.length}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={() => {
                if (!requireAuth()) return
                setShowCreateModal(true)
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{ backgroundColor: '#212529', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3D3D3D')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#212529')}
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#5F6368' }} />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E8E8E8',
                color: '#212529',
              }}
              onFocus={(e) => (e.currentTarget.style.outlineColor = '#212529')}
            />
          </div>
        </div>

        {/* No-suggestions notice for Discover tab */}
        {activeTab === 'all' && noSuggestions && filteredGroups.length > 0 && (
          <div
            className="rounded-xl border px-5 py-4 mb-4 text-sm"
            style={{ borderColor: '#E8E8E8', backgroundColor: '#FFFBEB', color: '#92400E' }}
          >
            Looks like we&apos;re out of suggestions for you right now. Continue exploring all available groups below.
          </div>
        )}



        {/* Groups Grid or Empty State for all tabs */}
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
            {activeTab === 'all' || activeTab === 'my-groups' ? (
              <>
                <h2 className="text-2xl font-semibold mb-2 text-gray-800">No Groups Yet</h2>
                <p className="mb-2">Looks like there are no groups available currently.</p>
                <p className="mb-6">Create a group and start building your community.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
                >
                  <Plus className="w-5 h-5" />
                  Create Group
                </button>
              </>
            ) : activeTab === 'requested' ? (
              <>
                <h2 className="text-2xl font-semibold mb-2 text-gray-800">No Requested Groups</h2>
                <p className="mb-2">You have not requested to join any groups yet.</p>
                <p className="mb-6">Discover and request to join groups to grow your network.</p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
                >
                  <Users className="w-5 h-5" />
                  Discover Groups
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                style={{ border: '1px solid #E8E8E8' }}
              >
                <img src={group.image} alt={group.name} className="w-full h-40 object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1" style={{ color: '#212529' }}>
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm mb-2" style={{ color: '#5F6368' }}>
                        {group.type === 'public' ? (
                          <Globe className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                        <span className="capitalize">{group.type} Group</span>
                        <span>•</span>
                        <span>{group.category}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: '#5F6368' }}>
                    {group.description}
                  </p>

                  <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: '#5F6368' }}>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{group.members.toLocaleString()} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>{group.posts.toLocaleString()} posts</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleJoinToggle(group.id) }}
                    disabled={group.requested && !group.joined}
                    className={`w-full py-2.5 rounded-lg font-medium border transition-all active:scale-95 ${group.requested && !group.joined ? 'cursor-not-allowed opacity-70' : ''}`}
                    style={{
                      backgroundColor: 'transparent',
                      color: group.joined ? '#DC2626' : group.requested ? '#5F6368' : '#212529',
                      borderColor: group.joined ? '#DC2626' : group.requested ? '#9CA3AF' : '#212529',
                    }}
                    onMouseEnter={(e) => {
                      if (group.joined) {
                        e.currentTarget.style.backgroundColor = '#DC2626'
                        e.currentTarget.style.color = '#FFFFFF'
                      } else if (!group.requested) {
                        e.currentTarget.style.backgroundColor = '#212529'
                        e.currentTarget.style.color = '#FFFFFF'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (group.joined) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#DC2626'
                      } else if (!group.requested) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#212529'
                      }
                    }}
                  >
                    {group.joined ? 'Leave Group' : group.requested ? 'Requested' : group.requiresApproval ? 'Request to Join' : 'Join Group'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
            <div className="bg-white w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">

              {/* HEADER */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create Group</h2>
                <button onClick={() => { setShowCreateModal(false); setShowAdvanced(false); setRuleInput('') }}>✕</button>
              </div>

              {/* FORM */}
              <div className="space-y-4">

                {/* NAME */}
                <input
                  type="text"
                  placeholder="Group Name"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border"
                />

                {/* DESCRIPTION */}
                <textarea
                  placeholder="Group Description"
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border"
                />

                {/* IMAGE */}
                <input
                  type="file"
                  id="media-upload"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const err = validateImageFile(file)
                    if (err) { alert(err); return }
                    setNewGroup({ ...newGroup, cover_image: file })
                  }}
                  className="w-full px-4 py-3 rounded-lg border"
                />

                {/* VISIBILITY */}
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setNewGroup({ ...newGroup, visibility: 'PUBLIC' })
                    }
                    className={`flex-1 py-2 rounded-lg ${newGroup.visibility === 'PUBLIC'
                        ? 'bg-black text-white'
                        : 'bg-gray-100'
                      }`}
                  >
                    Public
                  </button>

                  <button
                    onClick={() =>
                      setNewGroup({ ...newGroup, visibility: 'PRIVATE' })
                    }
                    className={`flex-1 py-2 rounded-lg ${newGroup.visibility === 'PRIVATE'
                        ? 'bg-black text-white'
                        : 'bg-gray-100'
                      }`}
                  >
                    Private
                  </button>
                </div>
              </div>

              {/* ADVANCED SETTINGS */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span
                    className="inline-block transition-transform duration-200"
                    style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    ▶
                  </span>
                  Advanced Settings
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Group Rules</p>
                    <p className="text-xs text-gray-400">Up to 10 rules. Press Enter or click Add.</p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. No spam or self-promotion..."
                        value={ruleInput}
                        maxLength={200}
                        onChange={(e) => setRuleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && ruleInput.trim() && newGroup.rules.length < 10) {
                            e.preventDefault()
                            setNewGroup(prev => ({ ...prev, rules: [...prev.rules, ruleInput.trim()] }))
                            setRuleInput('')
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={!ruleInput.trim() || newGroup.rules.length >= 10}
                        onClick={() => {
                          if (ruleInput.trim() && newGroup.rules.length < 10) {
                            setNewGroup(prev => ({ ...prev, rules: [...prev.rules, ruleInput.trim()] }))
                            setRuleInput('')
                          }
                        }}
                        className="px-3 py-2 bg-black text-white text-sm rounded-lg disabled:opacity-40 transition-opacity"
                      >
                        Add
                      </button>
                    </div>

                    {newGroup.rules.length > 0 && (
                      <ol className="space-y-1">
                        {newGroup.rules.map((rule, idx) => (
                          <li
                            key={idx}
                            className="flex items-start justify-between gap-2 text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-100"
                          >
                            <span>
                              <span className="font-semibold text-gray-400 mr-1">{idx + 1}.</span>
                              {rule}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setNewGroup(prev => ({
                                  ...prev,
                                  rules: prev.rules.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-red-400 hover:text-red-600 text-xs font-bold flex-shrink-0 leading-none"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}

                    {newGroup.rules.length >= 10 && (
                      <p className="text-xs text-amber-600">Maximum of 10 rules allowed.</p>
                    )}
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowCreateModal(false); setShowAdvanced(false); setRuleInput('') }}
                  className="px-4 py-2 rounded-lg bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateGroup}
                  className="px-4 py-2 rounded-lg bg-black text-white"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
