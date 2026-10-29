'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { LoginSchema, type LoginInput } from '@/lib/validations'
import { Input, PasswordInput } from '@/components/shared/Input'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux'
import { login } from '@/redux/slices/authSlice'
import { isAdmin } from '@/lib/roles'
import { mapAuthError } from '@/lib/auth-errors'

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const authUser = useAppSelector((state) => state.auth.user)
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const authLoading = useAppSelector((state) => state.auth.isLoading)
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingRedirect) return
    if (authLoading || !isAuthenticated || !authUser) return

    if (process.env.NODE_ENV === 'development') {
      console.log('[auth] login redirect', {
        reason: 'redux-auth-ready',
        target: pendingRedirect,
      })
    }

    router.push(pendingRedirect)
    setPendingRedirect(null)
  }, [pendingRedirect, authLoading, isAuthenticated, authUser, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    shouldUnregister: false,
  })

  const onSubmit = async (data: LoginInput) => {
    setError(null)
    try {
      const result = await dispatch(login(data))
      if (login.fulfilled.match(result)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[auth] login page received fulfilled action', {
            isRestricted: Boolean(result.payload?.isRestricted),
            hasUser: Boolean(result.payload?.user),
            cookieLength: typeof document !== 'undefined' ? document.cookie.length : 0,
          })
        }

        // 🚫 Restricted user — redirect to restriction page (do not logout)
        if (result.payload.isRestricted) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[auth] login redirect', {
              reason: 'restricted-user',
              target: '/account-restricted',
            })
          }
          router.push('/account-restricted')
          return
        }

        // Redirect based on role
        const roleId = result.payload.user.role_id

        // 🔥 Save user properly (IMPORTANT for layout)
        localStorage.setItem('user', JSON.stringify(result.payload.user))

        // Await isAdmin (async)
        if (await isAdmin(roleId)) {
          setPendingRedirect('/admin/dashboard')
        } else {
          setPendingRedirect('/')
        }
      } else if (login.rejected.match(result)) {
        setError(mapAuthError(result.payload, 'login'))
      }
    } catch (err) {
      setError(mapAuthError(err, 'login'))
    }
  }

  const handleGoogleLogin = () => {
    if (googleLoading || isSubmitting) return
    setGoogleLoading(true)
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:4000'}/auth/google`
  }

  return (
    <div>
      <Card>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">Welcome Back</h1>
          <p className="text-secondary-600">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5" aria-hidden>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <Input
            {...register('email')}
            type="email"
            placeholder="your@email.com"
            label="Email Address"
            error={errors.email?.message}
            autoComplete="email"
            disabled={isSubmitting}
          />

          <PasswordInput
            {...register('password')}
            placeholder="••••••••"
            label="Password"
            error={errors.password?.message}
            autoComplete="current-password"
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="rounded border-secondary-300" />
              <span className="text-secondary-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" fullWidth isLoading={isSubmitting} variant="accent" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        {/* Google Auth Button */}
        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-secondary-600">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={googleLoading || isSubmitting}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#4285F4"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#34A853"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.9 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            )}
            <span className="text-secondary-700 font-medium">
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </span>
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-secondary-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent-600 hover:text-accent-700 font-medium">
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  )
}
