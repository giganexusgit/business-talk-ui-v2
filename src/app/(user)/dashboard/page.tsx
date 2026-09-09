'use client'

import MainFeed from '@/components/user/MainFeed'
import { RightSidebar } from '@/components/user/RightSidebar'

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full gap-6 p-2 sm:p-4 lg:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      
      {/* MAIN FEED */}
      <div className="flex-1 min-w-0">
        <MainFeed />
      </div>

      {/* RIGHT SIDEBAR - Desktop only */}
      <div className="hidden xl:block shrink-0">
        <RightSidebar />
      </div>
    </div>
  )
}