'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert, LogOut, Mail } from 'lucide-react'
import { useAppSelector } from '@/hooks/useRedux'
import apiClient from '@/lib/api-client'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/constants'

export default function AccountRestrictedPage() {
  const router = useRouter()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch {
      // ignore API errors — still clear local state
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
    }
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-8 text-center" style={{ borderColor: '#E8E8E8' }}>
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-semibold mb-2" style={{ color: '#212529' }}>
          Account Restricted
        </h1>

        <p className="text-sm mb-2" style={{ color: '#5F6368' }}>
          Your account has been restricted.
        </p>
        <p className="text-sm mb-6" style={{ color: '#5F6368' }}>
          Please contact support at{' '}
          <a
            href={SUPPORT_MAILTO}
            className="text-blue-600 hover:underline font-medium"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>

        {user && (
          <p className="text-xs mb-6 text-gray-400">
            Logged in as {user.email}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <a
            href={`${SUPPORT_MAILTO}?subject=Account Restriction Appeal&body=Hello, my account (${user?.email ?? ''}) has been restricted. I would like to appeal this decision.`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>

          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#E8E8E8', color: '#5F6368' }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
