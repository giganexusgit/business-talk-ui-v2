import type { Metadata } from 'next'
import Link from 'next/link'
import HomePageContent from '@/components/user/HomePageContent'

export const metadata: Metadata = {
  title: {
    absolute: 'BusinessTalk24 — Professional Networking Platform & Business Community',
  },
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
  return (
    <>
      {/* 🏷️ Homepage Brand Identity, Primary H1 & Crawlable Navigation (Server-Side Rendered for Googlebot) */}
      <header className="sr-only">
        <h1>BusinessTalk24 — Professional Networking Platform & Business Community</h1>
        <p>
          Connect, collaborate, and grow your business with BusinessTalk24. Share professional insights, ask business questions, explore entrepreneurial stories, and network with verified professionals worldwide.
        </p>
        <nav aria-label="Explore Platform">
          <Link href="/questions">Business Q&A</Link>
          <Link href="/stories">Stories</Link>
          <Link href="/blogs">Blogs</Link>
          <Link href="/people">People</Link>
          <Link href="/groups">Groups</Link>
          <Link href="/about">About Us</Link>
        </nav>
      </header>
      <HomePageContent />
    </>
  )
}
