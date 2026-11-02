import type { Metadata } from 'next'
import HomePageContent from '@/components/user/HomePageContent'

export const metadata: Metadata = {
  title: 'Real Business Stories, Founder Journeys & Startup Lessons',
  description: 'Explore authentic entrepreneurial stories, startup hurdles, lessons learned, and business breakthroughs shared by founders and builders on BusinessTalk24.',
  keywords: 'business stories, founder journeys, startup success stories, entrepreneur experiences, lessons in business, real entrepreneurial journeys, startup failure lessons, bootstrapper stories',
  alternates: {
    canonical: '/stories',
  },
}

export default function StoriesPage() {
  return <HomePageContent initialTab="stories" />
}
