'use client'

// Mobile Routing Structure for Universal Content Viewer
// Place these files in your app directory following Next.js 14 conventions

/**
 * APP ROUTER STRUCTURE (for Mobile Navigation)
 * 
 * When on mobile, clicking content opens dedicated page instead of modal
 * Routes use dynamic segments for content IDs
 */

// File: src/app/(user)/post/[id]/page.tsx
/*
import { useParams } from 'next/navigation'
import { PostViewCard } from '@/components/shared/viewer-cards/PostViewCard'

export default function PostPage() {
  const params = useParams()
  const id = params.id as string

  // TODO: Fetch post data based on id
  const postData = {
    id,
    author: { name: 'John Doe', title: 'CEO', avatar: '/avatar.png' },
    content: 'Sample post content',
    timestamp: 'just now',
    likes: 42,
    comments: 5,
    sends: 3
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <PostViewCard data={postData} />
      </div>
    </div>
  )
}
*/

// File: src/app/(user)/blog/[id]/page.tsx
/*
import { useParams } from 'next/navigation'
import { BlogViewCard } from '@/components/shared/viewer-cards/BlogViewCard'

export default function BlogPage() {
  const params = useParams()
  const id = params.id as string

  // TODO: Fetch blog data based on id
  const blogData = {
    id,
    author: { name: 'Jane Smith', title: 'Writer', avatar: '/avatar.png' },
    storyTitle: 'My Journey as a Developer',
    excerpt: 'Full blog content here...',
    timestamp: 'Feb 14, 2025',
    readTime: '8 min read',
    category: 'Technology',
    coverImage: '/blog-cover.jpg',
    views: 1200,
    comments: 35
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <BlogViewCard data={blogData} />
      </div>
    </div>
  )
}
*/

// File: src/app/(user)/question/[id]/page.tsx
/*
import { useParams } from 'next/navigation'
import { QuestionViewCard } from '@/components/shared/viewer-cards/QuestionViewCard'

export default function QuestionPage() {
  const params = useParams()
  const id = params.id as string

  // TODO: Fetch question data based on id
  const questionData = {
    id,
    author: { name: 'Mike Johnson', title: 'Developer', avatar: '/avatar.png' },
    question: 'How to optimize React performance?',
    description: 'I have a React app that is running slow...',
    tags: ['React', 'Performance', 'JavaScript'],
    timestamp: 'Feb 10, 2025',
    answers: 12,
    views: 523,
    answersList: []
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <QuestionViewCard data={questionData} />
      </div>
    </div>
  )
}
*/

// File: src/app/(user)/story/[id]/page.tsx
/*
import { useParams } from 'next/navigation'
import { StoryViewCard } from '@/components/shared/viewer-cards/StoryViewCard'

export default function StoryPage() {
  const params = useParams()
  const id = params.id as string

  // TODO: Fetch story data based on id
  const storyData = {
    id,
    author: { name: 'Alice Wonder', title: 'Storyteller', avatar: '/avatar.png' },
    storyTitle: 'A Day in the Life',
    excerpt: 'Story content here...',
    timestamp: 'Feb 12, 2025',
    readTime: '6 min read',
    category: 'Lifestyle',
    coverImage: '/story-cover.jpg',
    views: 856,
    comments: 23
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <StoryViewCard data={storyData} />
      </div>
    </div>
  )
}
*/

/**
 * OPTIONAL: Desktop Query Param Sync
 * 
 * If you want to sync URL with query params on desktop:
 * ?view=post&id=123 → shows post modal
 * 
 * Usage in UniversalContentViewer:
 * 
 * useEffect(() => {
 *   if (!isMobile && isOpen && type && data?.id) {
 *     const params = new URLSearchParams(window.location.search)
 *     params.set('view', type)
 *     params.set('id', data.id)
 *     window.history.replaceState(null, '', `?${params.toString()}`)
 *   }
 * }, [isMobile, isOpen, type, data])
 */

export {}
