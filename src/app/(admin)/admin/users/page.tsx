'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Download,
  Eye,
  AlertTriangle,
  Ban,
  Trash2,
  CheckCircle,
  X,
} from 'lucide-react'

import apiClient from '@/lib/api-client'
import { useSearchParams } from 'next/navigation'
import adminApi from '@/lib/admin-api'
import BioText from '@/components/common/BioText'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'reported'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [fullProfile, setFullProfile] = useState<any | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  // ================= CURRENT USER =================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setCurrentUser(user)
  }, [])

  // ================= FETCH USERS =================
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await adminApi.getAllUsers()

        const normalized = res.data.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.username || 'User',
          email: u.email,
          company: u.company || 'N/A',
          role: u.profession || 'User',

          posts: 0,
          followers: 0,
          lastActive: 'N/A',

          status: u.is_banned
            ? 'suspended'
            : u.warning_count > 0
            ? 'reported'
            : 'active',

          verified: u.is_verified || false,
          is_banned: u.is_banned,
          warning_count: u.warning_count,
        }))

        setUsers(normalized)
        setFilteredUsers(normalized)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // If ?q= is present, use backend search API for users
  const searchParams = useSearchParams()
  const qParam = searchParams?.get('q') || ''

  useEffect(() => {
    if (!qParam) return

    const run = async () => {
      try {
        const res = await apiClient.searchAll(qParam, 'users', 1, 50)
        const items: any[] = res?.data?.items ?? res?.data ?? []
        const normalized = (items || []).map((u: any) => ({
          id: u.id,
          name: u.full_name || u.username || u.name || 'User',
          email: u.email,
          company: u.company || 'N/A',
          role: u.profession || 'User',
          posts: 0,
          followers: 0,
          lastActive: 'N/A',
          status: u.is_banned ? 'suspended' : u.warning_count > 0 ? 'reported' : 'active',
          verified: u.is_verified || false,
          is_banned: u.is_banned,
          warning_count: u.warning_count,
        }))

        setUsers(normalized)
        setFilteredUsers(normalized)
      } catch (err) {
        // ignore
      }
    }

    run()
  }, [qParam])

  // ================= FILTER =================
  useEffect(() => {
    let temp = users

    if (filter !== 'all') {
      temp = temp.filter((u) => u.status === filter)
    }

    if (searchQuery) {
      temp = temp.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.company.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredUsers(temp)
  }, [searchQuery, filter, users])

  // ================= HELPERS =================
  const isSameUser = (user: any) => currentUser?.id === user.id

  const openUserModal = async (u: any) => {
    setSelectedUser(u)
    setFullProfile(null)
    setProfileLoading(true)
    try {
      const res = await apiClient.getUserById(u.id)
      setFullProfile(res.data)
    } catch {
      /* leave as null, modal shows fallback */
    } finally {
      setProfileLoading(false)
    }
  }

  const closeUserModal = () => {
    setSelectedUser(null)
    setFullProfile(null)
  }

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  // ================= ACTIONS =================

  const handleWarn = async (id: string) => {
    await adminApi.warnUser(id)

    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, warning_count: u.warning_count + 1, status: 'reported' }
          : u
      )
    )
  }

  const handleBanToggle = async (user: any) => {
    if (user.is_banned) await adminApi.unbanUser(user.id)
    else await adminApi.banUser(user.id)

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              is_banned: !u.is_banned,
              status: !u.is_banned ? 'suspended' : 'active',
            }
          : u
      )
    )
  }

  const handleDelete = async (id: string) => {
    await apiClient.delete(`/user/${id}`)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  // ================= STATS =================
  const total = users.length
  const active = users.filter((u) => u.status === 'active').length
  const suspended = users.filter((u) => u.status === 'suspended').length
  const reported = users.filter((u) => u.status === 'reported').length

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Users Management</h1>
        <p className="text-sm text-gray-500">Manage platform users</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat title="Total Users" value={total} />
        <Stat title="Active Users" value={active} green />
        <Stat title="Suspended" value={suspended} red />
        <Stat title="Reported" value={reported} yellow />
      </div>

      {/* FILTERS */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex gap-3 flex-wrap">

          {/* SEARCH */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded w-full"
              placeholder="Search users..."
            />
          </div>

          {/* TABS */}
          {['all', 'active', 'suspended', 'reported'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={`px-4 py-2 rounded ${
                filter === t ? 'bg-blue-600 text-white' : 'bg-white border'
              }`}
            >
              {t}
            </button>
          ))}

          <button className="px-4 py-2 border rounded flex gap-2">
            <Download size={16} /> Export
          </button>
        </div>

        {/* BULK */}
        {selectedUsers.length > 0 && (
          <div className="mt-3 flex gap-2">
            <button className="bg-yellow-600 text-white px-3 py-1 rounded">
              Suspend
            </button>
            <button className="bg-red-600 text-white px-3 py-1 rounded">
              Delete
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-white border-b text-left text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === filteredUsers.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3">User</th>
              <th className="p-3">Company</th>
              <th className="p-3">Activity</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">

                {/* SELECT */}
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUserSelection(u.id)}
                  />
                </td>

                {/* USER */}
                <td className="p-3 flex gap-3 items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white">
                    {u.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      {u.name}
                      {u.verified && <CheckCircle size={14} />}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </div>
                </td>

                {/* COMPANY */}
                <td className="p-3">{u.company}</td>

                {/* ACTIVITY */}
                <td className="p-3">
                  <div>{u.posts} posts</div>
                  <div className="text-xs text-gray-500">{u.followers} followers</div>
                </td>

                {/* STATUS */}
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    u.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : u.status === 'suspended'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {u.status}
                  </span>
                </td>

                {/* ACTIONS */}
                <td className="flex gap-2 justify-end p-3">

                  <button onClick={() => openUserModal(u)}>
                    <Eye size={16} />
                  </button>

                  <button onClick={() => handleWarn(u.id)}>
                    <AlertTriangle size={16} />
                  </button>

                  {!isSameUser(u) && (
                    <button onClick={() => handleBanToggle(u)}>
                      <Ban size={16} />
                    </button>
                  )}

                  {!isSameUser(u) && (
                    <button onClick={() => handleDelete(u.id)}>
                      <Trash2 size={16} />
                    </button>
                  )}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FULL PROFILE MODAL */}
      {selectedUser && (
        <div
          className="
            fixed
            inset-0
            bg-black/50
            flex
            justify-center
            items-center
            z-50
            p-4
          "
        >
          <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

            <button
              onClick={closeUserModal}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Cover image */}
            <div
              className="
                w-full
                h-48
                rounded-t-2xl
                relative
                bg-gradient-to-r
                from-blue-400
                to-blue-600
              "
            > {/* overflow-hidden */}
              {fullProfile?.cover_image && (
                <img
                  src={fullProfile.cover_image}
                  alt="cover"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Avatar + name */}
            <div className="px-6 pt-12 pb-6 overflow-y-auto flex-1">
              <div className="-mt-10 mb-3 flex items-end justify-between z-30 relative overflow-y">
                <img
                  src={
                    fullProfile?.profile_photo ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&size=80&background=1976D2&color=fff`
                  }
                  alt={selectedUser.name}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover shadow z-30 relative overflow-y"
                />
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium overflow-y ${
                    selectedUser.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : selectedUser.status === 'suspended'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {selectedUser.status}
                </span>
              </div>

              {profileLoading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading profile…</div>
              ) : (
                <>
                  <h2 className="text-lg font-bold">{fullProfile?.full_name || selectedUser.name}</h2>
                  {(fullProfile?.username) && (
                    <p className="text-sm text-gray-500 mb-1">@{fullProfile.username}</p>
                  )}
                  {(fullProfile?.profession || selectedUser.role) && (
                    <p className="text-sm font-medium text-blue-700 mb-3">
                      {fullProfile?.profession || selectedUser.role}
                    </p>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    {(fullProfile?.email || selectedUser.email) && (
                      <div>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Email</span>
                        <p className="font-medium truncate">{fullProfile?.email || selectedUser.email}</p>
                      </div>
                    )}
                    {(fullProfile?.phone_number) && (
                      <div>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Phone</span>
                        <p className="font-medium">{fullProfile.phone_number}</p>
                      </div>
                    )}
                    {(fullProfile?.company || selectedUser.company) && (
                      <div>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Company</span>
                        <p className="font-medium">{fullProfile?.company || selectedUser.company}</p>
                      </div>
                    )}
                    {(fullProfile?.location) && (
                      <div>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">Location</span>
                        <p className="font-medium">{fullProfile.location}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Warnings</span>
                      <p className={`font-semibold ${selectedUser.warning_count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {selectedUser.warning_count}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Banned</span>
                      <p className={`font-semibold ${selectedUser.is_banned ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedUser.is_banned ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {fullProfile?.short_bio && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bio</p>
                      <BioText content={fullProfile.short_bio} />
                    </div>
                  )}

                  {/* About */}
                  {(fullProfile?.about) && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">About</p>
                      <BioText content={fullProfile.about} />
                    </div>
                  )}

                  {/* Experience */}
                  {fullProfile?.experience?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Experience</p>
                      <div className="space-y-2">
                        {fullProfile.experience.map((exp: any, i: number) => (
                          <div key={i} className="text-sm border-l-2 border-blue-200 pl-3">
                            <p className="font-semibold">{exp.title || exp.position}</p>
                            <p className="text-gray-500">{exp.company}</p>
                            {(exp.start_date || exp.startDate) && (
                              <p className="text-xs text-gray-400">
                                {exp.start_date || exp.startDate} – {exp.end_date || exp.endDate || 'Present'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {fullProfile?.education?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Education</p>
                      <div className="space-y-2">
                        {fullProfile.education.map((edu: any, i: number) => (
                          <div key={i} className="text-sm border-l-2 border-purple-200 pl-3">
                            <p className="font-semibold">{edu.degree || edu.field}</p>
                            <p className="text-gray-500">{edu.institution || edu.school}</p>
                            {(edu.start_year || edu.year) && (
                              <p className="text-xs text-gray-400">
                                {edu.start_year || edu.year} – {edu.end_year || 'Present'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Action buttons */}
              <div
                className="flex gap-2 pt-4 flex-wrap"
                style={{ borderTop: '1px solid #F0F0F0' }}
              >
                <button
                  onClick={() => {
                    router.push(`/admin/users/${selectedUser.id}`)
                    closeUserModal()
                  }}
                  className="px-4 py-2 text-sm rounded-lg font-medium text-white bg-blue-600"
                >
                  View Full Profile
                </button>

                <button
                  onClick={() => handleWarn(selectedUser.id)}
                  className="px-4 py-2 text-sm rounded-lg font-medium"
                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                >
                  ⚠ Warn
                </button>

                {!isSameUser(selectedUser) && (
                  <button
                    onClick={() => { handleBanToggle(selectedUser); closeUserModal() }}
                    className={`px-4 py-2 text-sm rounded-lg font-medium text-white ${
                      selectedUser.is_banned ? 'bg-green-600' : 'bg-orange-600'
                    }`}
                  >
                    {selectedUser.is_banned ? '✓ Unban' : '⊘ Ban'}
                  </button>
                )}

                {!isSameUser(selectedUser) && (
                  <button
                    onClick={() => { handleDelete(selectedUser.id); closeUserModal() }}
                    className="px-4 py-2 text-sm rounded-lg font-medium text-white bg-red-600"
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ================= STAT COMPONENT =================
function Stat({ title, value, green, red, yellow }: any) {
  return (
    <div className={`p-4 rounded border ${
      green ? 'bg-green-50 border-green-200'
      : red ? 'bg-red-50 border-red-200'
      : yellow ? 'bg-yellow-50 border-yellow-200'
      : 'bg-gray-50'
    }`}>
      <p className="text-sm">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}