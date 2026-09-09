'use client'

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/constants'

export default function UserAgreementPage() {
  return (
    <div className="min-h-screen py-12" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ border: '1px solid #E8E8E8' }}>
          <div>
            <h1 className="text-3xl font-bold mb-6" style={{ color: '#212529' }}>Terms of Service & User Agreement</h1>
            <p className="mb-6" style={{ color: '#5F6368' }}>Last updated: 13th May, 2026</p>

            <div className="space-y-6" style={{ color: '#212529' }}>
              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>1. Acceptance of Terms</h2>
                <p style={{ color: '#5F6368' }}>
                  By accessing and using Businesstalk24, you accept and agree to be bound by the terms and provision
                  of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>2. Use License</h2>
                <p style={{ color: '#5F6368' }}>
                  You are granted a limited license to use the Businesstalk24 platform for lawful purposes. You may
                  not:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2" style={{ color: '#5F6368' }}>
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on others' intellectual property rights</li>
                  <li>Post offensive, defamatory, or threatening content</li>
                  <li>Attempt to gain unauthorized access to the platform</li>
                  <li>Spam or harass other users</li>
                  <li>Use bots or automated tools without permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>3. User Accounts</h2>
                <p style={{ color: '#5F6368' }}>
                  You are responsible for maintaining the confidentiality of your account credentials. You agree to
                  accept responsibility for all activities that occur under your account. You must notify us of any
                  unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>4. User-Generated Content</h2>
                <p style={{ color: '#5F6368' }}>
                  You retain all rights to content you post on the platform. By posting content, you grant us a
                  non-exclusive, royalty-free license to use, reproduce, modify, and distribute such content.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>5. Prohibited Conduct</h2>
                <p style={{ color: '#5F6368' }}>You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2" style={{ color: '#5F6368' }}>
                  <li>Engage in harassment, bullying, or abuse</li>
                  <li>Post false, misleading, or deceptive information</li>
                  <li>Attempt to impersonate another user or person</li>
                  <li>Collect personal information about other users</li>
                  <li>Engage in any illegal activity</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>6. Disclaimer of Warranties</h2>
                <p style={{ color: '#5F6368' }}>
                  The platform is provided "as is" and "as available" without any warranties, express or implied. We
                  do not warrant that the platform will be uninterrupted or error-free.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>7. Limitation of Liability</h2>
                <p style={{ color: '#5F6368' }}>
                  To the fullest extent permitted by law, Businesstalk24 shall not be liable for any indirect,
                  incidental, special, consequential, or punitive damages resulting from your use of the platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>8. Indemnification</h2>
                <p style={{ color: '#5F6368' }}>
                  You agree to indemnify and hold harmless Businesstalk24, its officers, directors, employees, and
                  agents from any claims, damages, or costs arising from your violation of these terms or your use of
                  the platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>9. Termination</h2>
                <p style={{ color: '#5F6368' }}>
                  We reserve the right to suspend or terminate your account if you violate these terms or engage in
                  illegal or unethical conduct. Termination is at our sole discretion.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>10. Changes to Terms</h2>
                <p style={{ color: '#5F6368' }}>
                  We may modify these terms at any time. Your continued use of the platform following the posting of
                  revised terms means you accept and agree to the changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-3" style={{ color: '#212529' }}>11. Contact Information</h2>
                <p style={{ color: '#5F6368' }}>
                  For questions about these terms, please contact us at:
                </p>
                <p className="mt-3">
                  Email:{' '}
                  <a href={SUPPORT_MAILTO} className="text-blue-600 underline font-medium hover:text-blue-800">
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
