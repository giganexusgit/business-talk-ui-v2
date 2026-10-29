'use client'

import { useContentViewer } from '@/hooks/useContentViewer'
/**
 * UNIVERSAL CONTENT VIEWER - INTEGRATION GUIDE
 * 
 * This file shows how to integrate the UniversalContentViewer system
 * into your application layout or feed component.
 */
import { UniversalContentViewer } from '@/components/shared/UniversalContentViewer'


/**
 * EXAMPLE 2: Using useContentViewer in Custom Components
 */
export function CustomContentGallery() {
  const { open, close, isOpen, currentData } = useContentViewer()

  const handlePostClick = (postId: string) => {
    const postData = {
      id: postId,
      author: { name: 'User', title: 'Title', avatar: '/avatar.png' },
      content: 'Post content...',
      timestamp: 'just now',
      likes: 0,
      comments: 0,
      sends: 0
    }
    open('posts', postData)
  }

  const handleBlogClick = (blogId: string) => {
    const blogData = {
      id: blogId,
      author: { name: 'Author', title: 'Writer', avatar: '/avatar.png' },
      storyTitle: 'Blog Title',
      excerpt: 'Blog excerpt...',
      timestamp: 'Feb 14, 2025',
      readTime: '5 min',
      category: 'Tech',
      views: 100,
      comments: 5
    }
    open('blogs', blogData)
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => handlePostClick('1')}
          className="p-4 bg-blue-100 rounded-lg hover:bg-blue-200"
        >
          Open Post
        </button>
        <button
          onClick={() => handleBlogClick('1')}
          className="p-4 bg-purple-100 rounded-lg hover:bg-purple-200"
        >
          Open Blog
        </button>
      </div>

      <UniversalContentViewer
        isOpen={isOpen}
        type={currentData ? 'posts' : null}
        data={currentData}
        onClose={close}
      />
    </>
  )
}

/**
 * EXAMPLE 3: Global Content Viewer Context (for app-wide access)
 */

import React, { ReactNode } from 'react'

// File: src/providers/ContentViewerProvider.tsx
export function ContentViewerProvider({ children }: { children: ReactNode }) {
  const viewer = useContentViewer()

  return (
    <>
      {children}
      <UniversalContentViewer
        isOpen={viewer.isOpen}
        type={viewer.currentType}
        data={viewer.currentData}
        onClose={viewer.close}
      />
    </>
  )
}

/**
 * Usage in your root layout:
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ContentViewerProvider>
 *           {children}
 *         </ContentViewerProvider>
 *       </body>
 *     </html>
 *   )
 * }
 */

/**
 * USAGE PATTERNS
 */

// Pattern 1: Direct component onClick
// (Example omitted to avoid unused variable error)

// Pattern 2: Separate handler function
// (Example omitted to avoid unused variable error)

// Pattern 3: Conditional rendering with data
// (Example omitted to avoid unused variable error)

/**
 * MOBILE BEHAVIOR
 * 
 * - UniversalContentViewer detects mobile/tablet (< 768px width)
 * - Instead of opening modal, it navigates to /{type}/{id}
 * - Mobile pages should display the same ViewCard component
 * - SEO friendly full URLs: /post/123, /blog/456, etc.
 */

/**
 * CUSTOMIZATION OPTIONS
 * 
 * 1. Modify modal styling:
 *    Edit UniversalContentViewer.tsx max-w-2xl, rounded-2xl, etc.
 * 
 * 2. Add keyboard shortcuts:
 *    Add handlers in UniversalContentViewer keydown effect
 * 
 * 3. Add animations:
 *    Use Framer Motion or CSS transitions in modal container
 * 
 * 4. Add content loading:
 *    Add skeleton loading state in viewer cards
 */


