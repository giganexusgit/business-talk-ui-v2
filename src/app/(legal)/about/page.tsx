import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us — Mission & Founder Vision',
  description: 'Discover the story behind BusinessTalk24. Learn how we empower entrepreneurs, professionals, and innovators through knowledge sharing and collaborative business discussions.',
  keywords: 'about businesstalk24, business networking mission, entrepreneur platform story, professional community vision, business knowledge sharing platform, who is businesstalk24',
  alternates: {
    canonical: '/about',
  },
}

import { UserSidebar } from '@/components/shared/UserSidebar'

export default function AboutPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar (visible on lg+) */}
      <UserSidebar />
      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto py-8 px-4 lg:ml-64">
        <h1 className="text-2xl font-bold mb-4">About Businesstalk24</h1>
        <p className="mb-2">Businesstalk24 is a business knowledge sharing platform for questions, ideas, and experiences.</p>
        <p className="mb-2">It provides a space where individuals at different stages of their business journey can ask questions, share ideas, contribute insights, and post their experiences and stories based on real perspectives.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Our Purpose</h2>
        <p className="mb-2">Our purpose is to create a focused environment for business-related discussions where people can exchange knowledge, explore ideas, and share their viewpoints.</p>
        <p className="mb-2">Businesstalk24 does not provide professional or guaranteed business advice. The platform is intended for user-driven discussions and knowledge sharing.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">What You Can Do</h2>
        <ul className="list-disc ml-6 mb-2">
          <li>Ask business-related questions</li>
          <li>Share ideas and perspectives</li>
          <li>Contribute insights based on experience</li>
          <li>Post experiences and business stories</li>
          <li>Engage in discussions with other users</li>
        </ul>
        <h2 className="text-xl font-semibold mt-6 mb-2">Our Approach</h2>
        <p className="mb-2">Businesstalk24 is built on the idea that knowledge develops through discussions, shared experiences, and individual viewpoints.</p>
        <p className="mb-2">All content on the platform is user-generated, and users are responsible for the information they share.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Platform Responsibility</h2>
        <p className="mb-2">Businesstalk24 acts as an intermediary platform and does not verify or guarantee the accuracy, completeness, or outcomes of any content shared.</p>
        <p className="mb-2">Users are encouraged to independently evaluate information before making decisions.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Community Focus</h2>
        <p className="mb-2">We aim to maintain a respectful and relevant environment through clear guidelines and moderation.</p>
        <p className="mb-2">Users are expected to follow platform rules and contribute responsibly.</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
        <p>For any queries or support, please use the Feedback & Support section.</p>
      </main>
    </div>
  );
}
