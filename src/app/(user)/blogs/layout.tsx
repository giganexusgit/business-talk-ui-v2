import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Business Blogs, Industry Analysis & Entrepreneurial Insights',
  description: 'Read trending business blogs, founder interviews, growth strategies, and actionable industry analysis authored by verified business leaders on BusinessTalk24.',
  keywords: 'business blogs, entrepreneur articles, startup growth strategies, industry analysis, marketing case studies, business management insights, B2B articles, tech startup guides',
  alternates: {
    canonical: '/blogs',
  },
}

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
