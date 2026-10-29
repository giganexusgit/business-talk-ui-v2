import type { Metadata } from 'next'
import QuestionDetailClient from './QuestionDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getQuestionData(id: string) {
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
  const question = await getQuestionData(id)

  if (!question) {
    return {
      title: 'Business Question & Discussion',
      description: 'Ask and answer business questions with entrepreneurs and experts on BusinessTalk24.',
      alternates: {
        canonical: `/questions/${id}`,
      },
    }
  }

  const rawText = question.description || question.content || 'Business Question'
  const cleanText = rawText.replace(/<[^>]*>/g, '').trim()
  const title = cleanText ? `${cleanText.slice(0, 70)}${cleanText.length > 70 ? '…' : ''}` : 'Business Q&A'
  const description = cleanText ? cleanText.slice(0, 160) : 'Explore business questions and expert answers on BusinessTalk24.'

  return {
    title,
    description,
    alternates: {
      canonical: `/questions/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://businesstalk24.com/questions/${id}`,
      type: 'article',
      publishedTime: question.created_on ? new Date(Number(question.created_on)).toISOString() : undefined,
      images: [
        {
          url: 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png',
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
      images: ['https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'],
    },
  }
}

export default async function QuestionDetailPage({ params }: PageProps) {
  const { id } = await params
  const question = await getQuestionData(id)

  const rawText = question?.description || question?.content || ''
  const cleanText = rawText.replace(/<[^>]*>/g, '').trim()

  const qaSchema = question
    ? {
        '@context': 'https://schema.org',
        '@type': 'QAPage',
        mainEntity: {
          '@type': 'Question',
          name: cleanText.slice(0, 100),
          text: cleanText,
          dateCreated: question.created_on ? new Date(Number(question.created_on)).toISOString() : undefined,
          author: {
            '@type': 'Person',
            name: question.user?.full_name || question.user?.username || 'Community Member',
          },
          upvoteCount: question.likes_count || question.upvotes || 0,
        },
      }
    : null

  return (
    <>
      {qaSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(qaSchema) }}
        />
      )}
      <QuestionDetailClient />
    </>
  )
}
