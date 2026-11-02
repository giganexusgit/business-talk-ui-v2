'use client'

import { Provider } from 'react-redux'
import { store } from '@/redux/store'
import { ContentViewerProvider } from '@/providers/ContentViewerProvider'
import { WebSocketProvider } from '@/providers/WebSocketProvider'
import { PushNotificationProvider } from '@/providers/PushNotificationProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fetchCurrentUser } from '@/redux/slices/authSlice'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthWallProvider } from '@/providers/AuthWallProvider'
import apiClient from '@/lib/api-client'

const PUBLIC_AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/google-success',
]

const AUTH_STABILIZATION_MS = 120_000
const LAST_LOGIN_AT_KEY = 'auth:last_login_at'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  const [queryClient] = useState(() => new QueryClient())
  const [forbiddenToast, setForbiddenToast] = useState(false)
  const [restrictedToast, setRestrictedToast] = useState(false)
  const [appToast, setAppToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const hydrationStartedRef = useRef(false)
  const authHydratingRef = useRef(false)
  const lastLoginTimestampRef = useRef(0)
  const router = useRouter()

  // Listen for regular 403 "Action not allowed" events
  useEffect(() => {
    const handler = () => {
      setForbiddenToast(true)
      setTimeout(() => setForbiddenToast(false), 3000)
    }
    window.addEventListener('action-forbidden', handler)
    return () => window.removeEventListener('action-forbidden', handler)
  }, [])

  // Listen for account-restriction events (dispatched by the API interceptor)
  useEffect(() => {
    const handler = () => {
      setRestrictedToast(true)
      setTimeout(() => setRestrictedToast(false), 4000)
    }
    window.addEventListener('account-restricted', handler)
    return () => window.removeEventListener('account-restricted', handler)
  }, [])

  // Listen for generic app toasts via CustomEvent { detail: { message, type } }
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as any
      if (!detail || typeof detail.message !== 'string') return
      setAppToast({ message: detail.message, type: detail.type })
      setTimeout(() => setAppToast(null), 3000)
    }
    window.addEventListener('app-toast', handler as EventListener)
    return () => window.removeEventListener('app-toast', handler as EventListener)
  }, [])

  // On app boot: hydrate auth state exactly once for protected surfaces.
  useEffect(() => {
    if (isPublicAuthRoute) {
      apiClient.setAuthHydrating(false)
      authHydratingRef.current = false
      if (process.env.NODE_ENV === 'development') {
        console.log('[auth] hydration skipped on public auth route', { pathname })
      }
      return
    }

    if (hydrationStartedRef.current) {
      return
    }

    hydrationStartedRef.current = true
    authHydratingRef.current = true

    if (typeof window !== 'undefined') {
      lastLoginTimestampRef.current = Number(localStorage.getItem(LAST_LOGIN_AT_KEY) || '0')
    }

    apiClient.setAuthHydrating(true)

    ;(async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[auth] hydration started', {
          pathname,
          lastLoginTimestamp: lastLoginTimestampRef.current || null,
        })
      }

      const lastLoginAt = lastLoginTimestampRef.current
      const withinRecentLoginWindow =
        Number.isFinite(lastLoginAt) &&
        lastLoginAt > 0 &&
        Date.now() - lastLoginAt <= AUTH_STABILIZATION_MS

      if (withinRecentLoginWindow) {
        const elapsed = Date.now() - lastLoginAt
        const delayMs = Math.max(0, Math.min(1500, AUTH_STABILIZATION_MS - elapsed))
        if (delayMs > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[auth] delaying fetchCurrentUser for stabilization window', {
              delayMs,
            })
          }
          await sleep(delayMs)
        }
      }

      try {
        // fetchCurrentUser returns { user, isRestricted }
        const result = await (store.dispatch(fetchCurrentUser()) as any).unwrap()
        if (process.env.NODE_ENV === 'development') {
          console.log('[auth] hydration completed', {
            hasUser: Boolean(result?.user),
            isRestricted: Boolean(result?.isRestricted),
          })
        }
        if (result?.isRestricted) {
          // Restricted users see the restricted page but keep their user data
          if (process.env.NODE_ENV === 'development') {
            console.log('[auth] redirect', {
              reason: 'restricted-account-from-hydration',
              target: '/account-restricted',
            })
          }
          router.replace('/account-restricted')
        }
      } catch {
        if (process.env.NODE_ENV === 'development') {
          console.log('[auth] hydration completed with no active session', {
            withinRecentLoginWindow,
          })
        }

        // Do not clear cache immediately after a successful login; Safari can
        // transiently reject /auth/me before cookies are fully visible.
        if (typeof window !== 'undefined' && !withinRecentLoginWindow) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[auth] clearing cached user', {
              reason: 'hydration-failed-outside-stabilization-window',
            })
          }
          localStorage.removeItem('user')
        }
      } finally {
        authHydratingRef.current = false
        apiClient.setAuthHydrating(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicAuthRoute])

  
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthWallProvider>
        {isPublicAuthRoute ? (
          children
        ) : (
          <WebSocketProvider>
            <PushNotificationProvider>
              <ContentViewerProvider>
                {children}
              </ContentViewerProvider>
            </PushNotificationProvider>
          </WebSocketProvider>
        )}

        {/* Toast: regular 403 permission errors */}
        {forbiddenToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl">
            Action not allowed
          </div>
        )}

        {/* Toast: account restricted */}
        {restrictedToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl">
            Your account is restricted. Please contact support.
          </div>
        )}

        {/* App toast (success / error / info) */}
        {appToast && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-sm font-medium px-5 py-3 rounded-full shadow-xl ${
              appToast.type === 'success' ? 'bg-green-600 text-white' : appToast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
            }`}
          >
            {appToast.message}
          </div>
        )}

        </AuthWallProvider>
      </QueryClientProvider>
    </Provider>
  )
}
