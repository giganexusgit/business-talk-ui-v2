import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Disclaimer & Advisory Notice',
  description: 'Read the BusinessTalk24 general disclaimer regarding user-generated content, financial discussions, and professional business opinions.',
  keywords: 'platform disclaimer, financial advice disclaimer, user generated content disclaimer, legal advisory notice, business liability disclaimer',
  alternates: {
    canonical: '/disclaimer',
  },
}

export default function DisclaimerPage() {
  return (
    <main className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Disclaimer</h1>
      <p className="mb-2">Businesstalk24 is a platform for sharing business-related questions, experiences, opinions, stories and insights.</p>
      <ul className="list-disc ml-6 mb-2">
        <li>All content is user-generated</li>
        <li>The platform does not provide professional, financial, or business advice</li>
        <li>We do not guarantee accuracy, reliability, or outcomes of any information</li>
      </ul>
      <p className="mb-2">Any actions taken based on content on this platform are at your own risk.</p>
      <p className="mb-2">Users are encouraged to independently verify information before making decisions.</p>
      <p className="mb-2">Businesstalk24 is not responsible for any loss, damage, or consequences arising from the use of the platform.</p>
      <p className="mb-2">We reserve the right to remove content and restrict users to maintain platform integrity.</p>
    </main>
  );
}
