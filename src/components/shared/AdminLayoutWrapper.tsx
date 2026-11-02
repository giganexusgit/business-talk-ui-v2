'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/shared/AdminSidebar'
import { AdminNavbar } from '@/components/shared/AdminNavbar'
import { isAdmin } from '@/lib/roles'
import { store } from '@/redux/store'

const isRestrictedUser = (user: any) =>
  Boolean(user?.is_banned || user?.isBanned || user?.is_shadow_banned || user?.isShadowBanned)

export const AdminLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false)

  const router = useRouter()

  useEffect(() => {
    // Only run the auth check once per mount — do not re-run on router changes
    // to avoid false logouts during ongoing admin sessions.
    if (checkedRef.current) return
    checkedRef.current = true

    try {
      // Prefer Redux store (always up-to-date) over localStorage
      const reduxUser = store.getState().auth?.user
      const stored = localStorage.getItem('user')
      const user = reduxUser || (stored ? JSON.parse(stored) : null)

      if (!user?.id) {
        router.replace('/login')
        return
      }

      if (!isAdmin(user.role_id)) {
        router.replace('/')
        return
      }

      if (isRestrictedUser(user)) {
        localStorage.removeItem('user')
        router.replace('/account-restricted')
        return
      }

      setLoading(false)
    } catch (err) {
      console.error('Auth check failed', err)
      router.replace('/login')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Checking admin access...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <AdminSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <AdminNavbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}