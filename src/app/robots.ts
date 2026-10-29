import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://businesstalk24.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/search',
        '/admin/',
        '/api/',
        '/drafts/',
        '/messages/',
        '/settings/',
        '/account-restricted/',
        '/complete-profile/',
        '/reset-password/',
        '/forgot-password/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
