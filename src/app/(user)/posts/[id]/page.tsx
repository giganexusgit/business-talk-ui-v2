import type { Metadata } from 'next'
import PostDetailClient from './PostDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPostData(id: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
    const res = await fetch(`${apiBase}/posts/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data || json
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const post = await getPostData(id)

  if (!post) {
    return {
      title: 'Business Post',
      description: 'Join business discussions, read insights, and connect with professionals on BusinessTalk24.',
      alternates: {
        canonical: `/posts/${id}`,
      },
    }
  }

  const rawText = post.content || post.description || 'Business Post'
  const cleanText = rawText.replace(/<[^>]*>/g, '').trim()
  const authorName = post.user?.full_name || post.user?.username || 'Community Member'
  const title = cleanText
    ? `${cleanText.slice(0, 60)}${cleanText.length > 60 ? '…' : ''} by ${authorName}`
    : `Post by ${authorName}`
  const description = cleanText ? cleanText.slice(0, 160) : `Join the business conversation with ${authorName} on BusinessTalk24.`

  const image =
    post.image ||
    (post.media && post.media[0]?.url) ||
    'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'

  return {
    title,
    description,
    alternates: {
      canonical: `/posts/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://businesstalk24.com/posts/${id}`,
      type: 'article',
      publishedTime: post.created_on ? new Date(Number(post.created_on)).toISOString() : undefined,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  await params
  return <PostDetailClient />
}
