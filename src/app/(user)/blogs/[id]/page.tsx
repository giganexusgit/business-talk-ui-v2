import type { Metadata } from 'next'
import BlogDetailClient from './BlogDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getBlogData(id: string) {
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
  const blog = await getBlogData(id)

  if (!blog) {
    return {
      title: 'Blog Article',
      description: 'Read business insights and entrepreneurial articles on BusinessTalk24.',
      alternates: {
        canonical: `/blogs/${id}`,
      },
    }
  }

  const title = blog.title ? `${blog.title}` : 'Blog Article'
  const description =
    blog.excerpt ||
    (blog.content ? blog.content.replace(/<[^>]*>/g, '').slice(0, 160) : '') ||
    'Read this insightful business article on BusinessTalk24.'
  const image =
    blog.cover_image && blog.cover_image.startsWith('http')
      ? blog.cover_image
      : 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'

  return {
    title,
    description,
    alternates: {
      canonical: `/blogs/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `https://businesstalk24.com/blogs/${id}`,
      type: 'article',
      publishedTime: blog.created_on ? new Date(Number(blog.created_on)).toISOString() : undefined,
      authors: [blog.user?.full_name || blog.user?.username || 'BusinessTalk24'],
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

export default async function BlogDetailPage({ params }: PageProps) {
  const { id } = await params
  const blog = await getBlogData(id)

  const articleSchema = blog
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.title || 'Business Article',
        description:
          blog.excerpt ||
          (blog.content ? blog.content.replace(/<[^>]*>/g, '').slice(0, 160) : ''),
        image: blog.cover_image || 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png',
        datePublished: blog.created_on ? new Date(Number(blog.created_on)).toISOString() : undefined,
        author: {
          '@type': 'Person',
          name: blog.user?.full_name || blog.user?.username || 'BusinessTalk24 User',
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
          '@id': `https://businesstalk24.com/blogs/${id}`,
        },
      }
    : null

  return (
    <>
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      <BlogDetailClient />
    </>
  )
}
