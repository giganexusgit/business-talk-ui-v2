'use client'

import { Suspense } from 'react'
import MainFeed from '@/components/user/MainFeed'
import { RightSidebar } from '@/components/user/RightSidebar'

export default function HomePageContent({ initialTab }: { initialTab?: 'home' | 'qa' | 'stories' } = {}) {
  return (
    <div className="flex min-h-screen w-full gap-6 p-2 sm:p-4 lg:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      {/* MAIN FEED */}
      <div className="flex-1 min-w-0">
        <Suspense fallback={<div className="p-6 text-gray-400">Loading feed...</div>}>
          <MainFeed initialTab={initialTab} />
        </Suspense>
      </div>

      {/* RIGHT SIDEBAR - Desktop only */}
      <div className="hidden xl:block shrink-0">
        <Suspense fallback={<div className="w-80" />}>
          <RightSidebar />
        </Suspense>
      </div>
    </div>
  )
}
