import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feedback & Help Center | Platform Support',
  description: 'Get assistance, report issues, or suggest new features for BusinessTalk24. Our support team is here to assist your professional networking experience.',
  keywords: 'businesstalk24 support, customer help, report platform issue, feature request, business community contact, helpdesk, user feedback',
  alternates: {
    canonical: '/feedback-support',
  },
}

export default function FeedbackSupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
