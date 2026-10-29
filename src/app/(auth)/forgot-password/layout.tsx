import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Your Password | Account Recovery',
  description: 'Recover your BusinessTalk24 account password securely. Enter your registered email address to receive password reset instructions.',
  keywords: 'reset password, account recovery, forgot password, secure password reset, restore account',
  alternates: {
    canonical: '/forgot-password',
  },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
