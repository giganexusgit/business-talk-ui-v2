import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join BusinessTalk24 — Free Professional Registration',
  description: 'Create your free BusinessTalk24 account today. Network with thousands of founders, join mastermind groups, and amplify your business visibility.',
  keywords: 'join businesstalk24, create business account, free registration, entrepreneur sign up, professional networking join, register business account',
  alternates: {
    canonical: '/signup',
  },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
