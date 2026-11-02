import type { Metadata } from 'next'
import ProfileSlugClient from './ProfileSlugClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

function parseIdFromSlug(slug?: string) {
  if (!slug) return ''
  const uuidMatch = slug.match(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
  )
  if (uuidMatch) return uuidMatch[0]
  const firstPart = slug.includes('-') ? slug.split('-')[0] : slug
  return firstPart
}

async function getUserData(slug: string) {
  const id = parseIdFromSlug(slug)
  if (!id) return null
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
    const res = await fetch(`${apiBase}/user/${id}`, {
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
  const { slug } = await params
  const user = await getUserData(slug)

  if (!user) {
    return {
      title: 'Professional Profile',
      description: 'Connect, network, and collaborate with verified professionals on BusinessTalk24.',
      alternates: {
        canonical: `/profile/${slug}`,
      },
    }
  }

  const name = user.full_name || user.username || 'Professional Profile'
  const title = user.profession ? `${name} - ${user.profession}` : `${name}`
  const description =
    user.bio ||
    user.about ||
    (user.profession ? `${name} is a ${user.profession} on BusinessTalk24.` : `Connect with ${name} on BusinessTalk24.`)
  const image =
    user.profile_photo && user.profile_photo.startsWith('http')
      ? user.profile_photo
      : 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png'

  return {
    title,
    description,
    alternates: {
      canonical: `/profile/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://businesstalk24.com/profile/${slug}`,
      type: 'profile',
      images: [
        {
          url: image,
          width: 800,
          height: 800,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
  }
}

export default async function UserProfilePage({ params }: PageProps) {
  const { slug } = await params
  const user = await getUserData(slug)

  const name = user?.full_name || user?.username || ''
  const personSchema = user
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name,
          alternateName: user.username,
          jobTitle: user.profession || undefined,
          description: user.bio || undefined,
          image: user.profile_photo || undefined,
          url: `https://businesstalk24.com/profile/${slug}`,
        },
      }
    : null

  return (
    <>
      {personSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      )}
      <ProfileSlugClient />
    </>
  )
}
