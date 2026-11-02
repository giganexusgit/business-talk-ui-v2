import type { Metadata } from 'next'
import HomePageContent from '@/components/user/HomePageContent'

export const metadata: Metadata = {
  title: 'BusinessTalk24 — Professional Networking Platform & Business Community',
  description: 'Connect with entrepreneurs, founders, and industry experts on BusinessTalk24. Share business insights, ask industry questions, and grow your professional network.',
  keywords: 'professional networking, business networking platform, entrepreneur community, business discussion forum, startup founders network, B2B networking, business collaboration, entrepreneur knowledge sharing',
  alternates: {
    canonical: 'https://businesstalk24.com/',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function HomePage() {
  return <HomePageContent />
}
