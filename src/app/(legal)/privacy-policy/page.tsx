'use client'

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/constants'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ border: '1px solid #E8E8E8' }}>
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#212529' }}>Privacy Policy</h1>
            <p className="mb-8 text-sm" style={{ color: '#5F6368' }}>Effective Date: 13th May, 2026</p>
            <p className="mb-8" style={{ color: '#5F6368' }}>
              BusinessTalk24 is committed to protecting user privacy.
            </p>

            <div className="space-y-8" style={{ color: '#212529' }}>
              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>1. Information Collected</h2>
                <p className="mb-2" style={{ color: '#5F6368' }}>We may collect:</p>
                <ul className="list-disc pl-6 space-y-1" style={{ color: '#5F6368' }}>
                  <li>Email address (required)</li>
                  <li>Phone number (optional)</li>
                  <li>Profile information</li>
                  <li>Usage data and cookies</li>
                </ul>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>2. Use of Information</h2>
                <p className="mb-2" style={{ color: '#5F6368' }}>We use data to:</p>
                <ul className="list-disc pl-6 space-y-1" style={{ color: '#5F6368' }}>
                  <li>Provide and manage services</li>
                  <li>Improve user experience</li>
                  <li>Communicate updates</li>
                  <li>Ensure security</li>
                </ul>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>3. Optional Phone Number</h2>
                <p style={{ color: '#5F6368' }}>
                  Providing a phone number is voluntary and not required to use the platform.
                </p>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>4. Data Sharing</h2>
                <p className="mb-2" style={{ color: '#5F6368' }}>
                  We do not sell personal data. Information may be shared:
                </p>
                <ul className="list-disc pl-6 space-y-1" style={{ color: '#5F6368' }}>
                  <li>With service providers</li>
                  <li>When required by law</li>
                </ul>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>5. Data Protection</h2>
                <p style={{ color: '#5F6368' }}>
                  We take reasonable steps to protect user data but cannot guarantee absolute security.
                </p>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>6. User Rights</h2>
                <p className="mb-2" style={{ color: '#5F6368' }}>Users may:</p>
                <ul className="list-disc pl-6 space-y-1" style={{ color: '#5F6368' }}>
                  <li>Access or update their data</li>
                  <li>Request deletion</li>
                  <li>Withdraw consent where applicable</li>
                </ul>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>7. Cookies</h2>
                <p style={{ color: '#5F6368' }}>
                  We use cookies to improve functionality and analyse usage.
                </p>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>8. Third-Party Services</h2>
                <p style={{ color: '#5F6368' }}>
                  We are not responsible for external websites or services linked from the platform.
                </p>
              </section>

              <hr style={{ borderColor: '#E8E8E8' }} />

              <section>
                <h2 className="text-lg font-semibold mb-3" style={{ color: '#212529' }}>9. Contact Us</h2>
                <p style={{ color: '#5F6368' }}>
                  For privacy concerns or support:{' '}
                  <a
                    href={SUPPORT_MAILTO}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
