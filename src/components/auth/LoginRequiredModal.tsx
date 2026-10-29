'use client'

import { useRouter } from 'next/navigation'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LoginRequiredModal({
  open,
  onClose,
}: Props) {
  const router = useRouter()

  if (!open) return null

  const currentUrl =
    typeof window !== 'undefined'
      ? window.location.pathname +
        window.location.search
      : '/'

  const loginUrl =
    `/login?redirect=${encodeURIComponent(
      currentUrl
    )}`

  const signupUrl =
    `/signup?redirect=${encodeURIComponent(
      currentUrl
    )}`

    const handleLogin = () => {
        onClose()
        router.push(loginUrl)
    }

    const handleSignup = () => {
        onClose()
        router.push(signupUrl)
    }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">

        <h2 className="text-2xl font-bold mb-2">
          Login Required
        </h2>

        <p className="text-gray-600 mb-6">
          Sign in or create an account to
          continue interacting on
          BusinessTalk24.
        </p>

        <div className="space-y-3">

          <button
            className="w-full bg-black text-white rounded-lg py-3"
            onClick={handleLogin}
          >
            Login
          </button>

          <button
            className="w-full border rounded-lg py-3"
            onClick={handleSignup}
          >
            Create Account
          </button>

          <button
            className="w-full text-gray-500 py-2"
            onClick={onClose}
          >
            Continue Browsing
          </button>

        </div>
      </div>
    </div>
  )
}