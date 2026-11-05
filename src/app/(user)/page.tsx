import type { Metadata } from 'next'
import Link from 'next/link'
import HomePageContent from '@/components/user/HomePageContent'

export const metadata: Metadata = {
  title: {
    absolute: 'Businesstalk24 – Knowledge Sharing & Community Platform',
  },
  description: 'Businesstalk24 is a knowledge-sharing community where people and businesses connect, ask questions, share ideas, publish content and discover opportunities.',
  keywords: 'knowledge sharing, business community, professional networking, ask questions, share ideas, publish content, discover opportunities, entrepreneur community, business Q&A',
  alternates: {
    canonical: 'https://businesstalk24.com/',
  },
  openGraph: {
    title: 'Businesstalk24 – Knowledge Sharing & Community Platform',
    description: 'Businesstalk24 is a knowledge-sharing community where people and businesses connect, ask questions, share ideas, publish content and discover opportunities.',
    url: 'https://businesstalk24.com/',
  },
  twitter: {
    title: 'Businesstalk24 – Knowledge Sharing & Community Platform',
    description: 'Businesstalk24 is a knowledge-sharing community where people and businesses connect, ask questions, share ideas, publish content and discover opportunities.',
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
        <h1>Businesstalk24 – Knowledge Sharing &amp; Community Platform</h1>
        <p>
          Businesstalk24 is a knowledge-sharing community where people and businesses connect, ask questions, share ideas, publish content and discover opportunities.
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
