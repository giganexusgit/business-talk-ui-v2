import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://businesstalk24.com'
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
  const currentDate = new Date()

  // 1. Core Static and Category Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/questions`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stories`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/people`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/groups`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/community-guidelines`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/user-agreement`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/feedback-support`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // 2. Fetch User-Generated Content dynamically (Blogs, Stories, Trending Questions)
  const dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    const [blogsRes, storiesRes, trendingRes] = await Promise.allSettled([
      fetch(`${apiBase}/blogs?page=1&limit=50`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/blogs?type=STORY&page=1&limit=50`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/trending/posts`, { next: { revalidate: 3600 } }),
    ])

    // Process Blogs
    if (blogsRes.status === 'fulfilled' && blogsRes.value.ok) {
      const blogsJson = await blogsRes.value.json()
      const blogs = Array.isArray(blogsJson.data) ? blogsJson.data : Array.isArray(blogsJson) ? blogsJson : []
      for (const item of blogs) {
        if (item.id && item.type !== 'STORY') {
          dynamicRoutes.push({
            url: `${baseUrl}/blogs/${item.id}`,
            lastModified: item.updated_on || item.created_on ? new Date(Number(item.updated_on || item.created_on)) : currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
          })
        }
      }
    }

    // Process Stories
    if (storiesRes.status === 'fulfilled' && storiesRes.value.ok) {
      const storiesJson = await storiesRes.value.json()
      const stories = Array.isArray(storiesJson.data) ? storiesJson.data : Array.isArray(storiesJson) ? storiesJson : []
      for (const item of stories) {
        if (item.id) {
          dynamicRoutes.push({
            url: `${baseUrl}/stories/${item.id}`,
            lastModified: item.updated_on || item.created_on ? new Date(Number(item.updated_on || item.created_on)) : currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
          })
        }
      }
    }

    // Process Trending Questions
    if (trendingRes.status === 'fulfilled' && trendingRes.value.ok) {
      const trendingJson = await trendingRes.value.json()
      const trending = Array.isArray(trendingJson.data) ? trendingJson.data : Array.isArray(trendingJson) ? trendingJson : []
      for (const item of trending) {
        if (item.id && (item.post_type || item.type)?.toUpperCase() === 'QUESTION') {
          dynamicRoutes.push({
            url: `${baseUrl}/questions/${item.id}`,
            lastModified: item.created_on ? new Date(Number(item.created_on)) : currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
          })
        }
      }
    }
  } catch {
    // Fail gracefully and return static routes if API is temporarily unavailable
  }

  return [...staticRoutes, ...dynamicRoutes]
}
