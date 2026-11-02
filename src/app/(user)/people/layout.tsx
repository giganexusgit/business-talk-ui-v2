import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Business Professionals, Founders & Industry Leaders',
  description: 'Browse the BusinessTalk24 professional directory. Connect with startup founders, C-level executives, investors, and business mentors across diverse global industries.',
  keywords: 'business directory, find entrepreneurs, connect with founders, professional networking search, business mentors, executive networking directory, B2B talent, startup partners',
  alternates: {
    canonical: '/people',
  },
}

export default function PeopleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
