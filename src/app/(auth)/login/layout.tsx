import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In to Your Business Account',
  description: 'Sign in to BusinessTalk24 to access your feed, message connections, collaborate in groups, and stay updated with the latest business discussions.',
  keywords: 'business login, sign in, account access, member login, professional portal, businesstalk24 sign in',
  alternates: {
    canonical: '/login',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
