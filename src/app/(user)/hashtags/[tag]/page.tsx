import type { Metadata } from 'next'
import HashtagDetailClient from './HashtagDetailClient'

interface PageProps {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params
  const cleanTag = decodeURIComponent(tag || '').replace(/^#/, '')
  const title = `#${cleanTag} Discussions, Blogs & Q&A`
  const description = `Explore trending business posts, expert answers, founder stories, and articles tagged with #${cleanTag} on BusinessTalk24.`

  return {
    title,
    description,
    keywords: `${cleanTag}, #${cleanTag}, ${cleanTag} business, ${cleanTag} networking, business topics, entrepreneur discussions`,
    alternates: {
      canonical: `/hashtags/${encodeURIComponent(cleanTag)}`,
    },
    openGraph: {
      title,
      description,
      url: `https://businesstalk24.com/hashtags/${encodeURIComponent(cleanTag)}`,
      type: 'website',
      images: ['https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'],
    },
  }
}

export default async function HashtagPage({ params }: PageProps) {
  await params
  return <HashtagDetailClient />
}
