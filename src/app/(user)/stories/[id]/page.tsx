import type { Metadata } from 'next'
import StoryDetailClient from './StoryDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getStoryData(id: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
    const res = await fetch(`${apiBase}/blogs/${id}`, {
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
  const story = await getStoryData(id)

  if (!story) {
    return {
      title: 'Business Story',
      description: 'Read entrepreneurial stories and real business journeys on BusinessTalk24.',
      alternates: {
        canonical: `/stories/${id}`,
      },
    }
  }

  const rawTitle = story.title || 'Business Story'
  const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').trim()
  const rawText = story.content || story.description || ''
  const cleanText = rawText.replace(/<[^>]*>/g, '').trim()
  const description = cleanText ? cleanText.slice(0, 160) : 'Read this real entrepreneurial journey on BusinessTalk24.'
  const image =
    story.cover_image && story.cover_image.startsWith('http')
      ? story.cover_image
      : 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'

  return {
    title: cleanTitle,
    description,
    alternates: {
      canonical: `/stories/${id}`,
    },
    openGraph: {
      title: cleanTitle,
      description,
      url: `https://businesstalk24.com/stories/${id}`,
      type: 'article',
      publishedTime: story.created_on ? new Date(Number(story.created_on)).toISOString() : undefined,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: cleanTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description,
      images: [image],
    },
  }
}

export default async function StoryDetailPage({ params }: PageProps) {
  const { id } = await params
  const story = await getStoryData(id)

  const rawTitle = story?.title || 'Business Story'
  const cleanTitle = rawTitle.replace(/<[^>]*>/g, '').trim()
  const rawText = story?.content || story?.description || ''
  const cleanText = rawText.replace(/<[^>]*>/g, '').trim()

  const storySchema = story
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: cleanTitle,
        description: cleanText.slice(0, 160),
        image: story.cover_image || 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png',
        datePublished: story.created_on ? new Date(Number(story.created_on)).toISOString() : undefined,
        author: {
          '@type': 'Person',
          name: story.user?.full_name || story.user?.username || 'Entrepreneur',
        },
        publisher: {
          '@type': 'Organization',
          name: 'BusinessTalk24',
          logo: {
            '@type': 'ImageObject',
            url: 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png',
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://businesstalk24.com/stories/${id}`,
        },
      }
    : null

  return (
    <>
      {storySchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storySchema) }}
        />
      )}
      <StoryDetailClient />
    </>
  )
}
