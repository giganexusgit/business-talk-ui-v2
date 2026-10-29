import type { Metadata } from 'next'
import HomePageContent from '@/components/user/HomePageContent'

export const metadata: Metadata = {
  title: 'Business Q&A Forum — Ask Entrepreneurs & Industry Experts',
  description: 'Have a business challenge? Ask questions, get expert solutions, and discuss strategy, legal, marketing, and tech with seasoned entrepreneurs on BusinessTalk24.',
  keywords: 'business Q&A forum, ask business questions, entrepreneur advice, startup problem solving, business consulting community, industry expert answers, B2B discussions, business troubleshooting',
  alternates: {
    canonical: '/questions',
  },
}

export default function QuestionsPage() {
  return <HomePageContent initialTab="qa" />
}
