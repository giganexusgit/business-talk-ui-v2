import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/constants'

export default function CommunityGuidelinesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
      <div className="bg-white rounded-2xl border p-6 md:p-10 shadow-sm" style={{ borderColor: '#E8E8E8' }}>
        <h1 className="text-3xl font-bold mb-2">Community Guidelines</h1>
        <p className="text-sm text-gray-500 mb-6">Effective Date: 13th May, 2026</p>

        <p className="mb-6 text-gray-600">
          At <b>BusinessTalk24</b>, our mission is to build a high-quality community for entrepreneurs, professionals, and business enthusiasts.
        </p>

        <ol className="list-decimal ml-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <li>
            <b>Be Respectful & Professional:</b> Treat all members with courtesy. Constructive criticism and healthy business debate are encouraged.
          </li>
          <li>
            <b>High-Quality Content:</b> Share accurate business insights, genuine questions, and real experiences. Spam or clickbait is strictly prohibited.
          </li>
          <li>
            <b>No Harassment or Misinformation:</b> We do not tolerate hate speech, bullying, or deliberate spread of false financial or business claims.
          </li>
          <li>
            <b>Platform Rights:</b> BusinessTalk24 reserves the right to remove non-compliant content and restrict or suspend accounts.
          </li>
          <li>
            <b>Contact Us:</b> For reporting issues or support queries:{' '}
            <a href={SUPPORT_MAILTO} className="text-blue-600 underline font-medium hover:text-blue-800">
              {SUPPORT_EMAIL}
            </a>
          </li>
        </ol>
      </div>
    </main>
  );
}
