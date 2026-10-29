import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Business Communities, Industry Groups & Founder Masterminds',
  description: 'Join high-impact business groups and niche industry communities on BusinessTalk24. Collaborate with peers, share resources, and participate in exclusive mastermind discussions.',
  keywords: 'business groups, industry communities, founder mastermind, entrepreneur groups, professional mastermind network, business clubs online, peer networking groups, startup cohorts',
  alternates: {
    canonical: '/groups',
  },
}

export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
