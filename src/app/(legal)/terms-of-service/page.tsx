import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/constants'

export default function TermsOfServicePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
      <div className="bg-white rounded-2xl border p-6 md:p-10 shadow-sm" style={{ borderColor: '#E8E8E8' }}>
        <h1 className="text-3xl font-bold mb-2">Terms and Conditions</h1>
        <p className="text-sm text-gray-500 mb-6">Effective Date: 13th May, 2026</p>
        <p className="mb-6 text-gray-600">
          Welcome to <b>BusinessTalk24</b>. By accessing or using this platform, you agree to comply with these Terms and Conditions.
        </p>

        <ol className="list-decimal ml-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <li>
            <b>Platform Nature:</b> BusinessTalk24 is a business knowledge sharing platform where users can ask questions, share ideas, post experiences, and contribute insights. All content on this platform is user-generated and is intended for informational purposes only.
          </li>
          <li>
            <b>User Eligibility:</b> You must be at least 18 years old or use the platform under appropriate legal supervision.
          </li>
          <li>
            <b>User Accounts:</b>
            <ul className="list-disc ml-6 mt-1 space-y-1 text-gray-600">
              <li>Registration requires a valid email address.</li>
              <li>Phone number is optional and provided at the user’s discretion.</li>
              <li>Users are responsible for maintaining account confidentiality.</li>
            </ul>
          </li>
          <li>
            <b>User-Generated Content:</b>
            <ul className="list-disc ml-6 mt-1 space-y-1 text-gray-600">
              <li>Users are solely responsible for the content they post.</li>
              <li>BusinessTalk24 does not verify or guarantee accuracy or reliability.</li>
              <li>Content reflects individual opinions, not the platform.</li>
            </ul>
          </li>
          <li>
            <b>Acceptable Use:</b> Users agree to post only relevant business-related content and must not:
            <ul className="list-disc ml-6 mt-1 space-y-1 text-gray-600">
              <li>Share misleading or fraudulent information.</li>
              <li>Post spam or irrelevant content.</li>
              <li>Harass or abuse other users.</li>
              <li>Violate any laws or third-party rights.</li>
            </ul>
          </li>
          <li>
            <b>Content Moderation:</b> BusinessTalk24 reserves the right to review, remove, or restrict content that violates platform rules or is deemed inappropriate.
          </li>
          <li>
            <b>Limitation of Liability:</b> BusinessTalk24 is not liable for decisions made based on user content or losses arising from reliance on shared information.
          </li>
          <li>
            <b>Governing Law:</b> These Terms are governed by the laws of India.
          </li>
          <li>
            <b>Contact Us:</b> For queries or support:{' '}
            <a href={SUPPORT_MAILTO} className="text-blue-600 underline font-medium hover:text-blue-800">
              {SUPPORT_EMAIL}
            </a>
          </li>
        </ol>
      </div>
    </main>
  );
}
