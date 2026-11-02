'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api-client'
import { useAppDispatch } from '@/hooks/useRedux'
import { setUser } from '@/redux/slices/authSlice'
import { isAdmin } from '@/lib/roles'
import { mapAuthError } from '@/lib/auth-errors'

export default function GoogleSuccessPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiClient.getMyProfile()
        const user = res.data

        dispatch(setUser(user))
        localStorage.setItem('user', JSON.stringify(user))

        if (await isAdmin(user.role_id)) {
          router.replace('/admin/dashboard')
        } else {
          router.replace('/')
        }
      } catch (err) {
        const msg = mapAuthError(err, 'google')
        setErrorMsg(msg)
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    init()
  }, [dispatch, router])

  if (errorMsg) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-sm max-w-sm text-center">
          <p className="font-semibold mb-1">Sign-in failed</p>
          <p>{errorMsg}</p>
        </div>
        <p className="text-secondary-500 text-sm">Redirecting to login…</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-label="Loading" />
      <p className="text-secondary-600 text-sm">Signing you in…</p>
    </div>
  )
}