'use client'

import { useState } from 'react'
import { MessageSquare, Bug, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/constants'

const TYPES = [
  { value: 'bug',        label: 'Bug Report',   icon: Bug,          desc: 'Something is broken or not working as expected', color: '#DC3545' },
  { value: 'issue',      label: 'Issue',        icon: AlertCircle,  desc: 'A problem or concern with the platform',         color: '#FD7E14' },
  { value: 'suggestion', label: 'Suggestion',   icon: Lightbulb,    desc: 'An idea or feature request to improve the app',  color: '#1976D2' },
] as const

type FeedbackType = 'bug' | 'issue' | 'suggestion'

const MAX_CHARS = 2000

export default function FeedbackSupportPage() {
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = TYPES.find(t => t.value === type)!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) { setError('Please write your message before submitting.'); return }
    if (message.length > MAX_CHARS) { setError(`Message must be ${MAX_CHARS} characters or fewer.`); return }

    setLoading(true)
    setError(null)
    try {
      await apiClient.submitFeedback({ type, message: message.trim() })
      setSuccess(true)
      setMessage('')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNewFeedback = () => { setSuccess(false); setError(null); setType('bug'); setMessage('') }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E3F2FD' }}>
              <MessageSquare className="w-5 h-5" style={{ color: '#1976D2' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#212529' }}>Feedback & Support</h1>
          </div>
          <p style={{ color: '#5F6368' }}>
            Help us improve BusinessTalk24. Share bugs, issues, or ideas — we read every submission.
          </p>
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="bg-white rounded-2xl border p-8 text-center" style={{ border: '1px solid #E8E8E8' }}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#212529' }}>Thank you for your feedback!</h2>
            <p className="mb-6" style={{ color: '#5F6368' }}>
              Your submission has been received. Our team will review it shortly.
            </p>
            <button
              onClick={handleNewFeedback}
              className="px-6 py-3 rounded-xl text-white text-sm font-semibold transition-all"
              style={{ backgroundColor: '#212529' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#3D3D3D')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}
            >
              Submit another
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Type cards */}
            <div className="bg-white rounded-2xl border p-6" style={{ border: '1px solid #E8E8E8' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#212529' }}>Type of feedback</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TYPES.map(t => {
                  const Icon = t.icon
                  const active = type === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: active ? t.color : '#E8E8E8',
                        backgroundColor: active ? `${t.color}10` : '#FAFAFA',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: t.color }} />
                        <span className="text-sm font-semibold" style={{ color: active ? t.color : '#212529' }}>
                          {t.label}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: '#5F6368' }}>{t.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Message form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-4" style={{ border: '1px solid #E8E8E8' }}>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold" style={{ color: '#212529' }}>
                    Your message <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs" style={{ color: message.length > MAX_CHARS * 0.9 ? '#DC3545' : '#5F6368' }}>
                    {message.length} / {MAX_CHARS}
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={6}
                  maxLength={MAX_CHARS}
                  placeholder={
                    type === 'bug'        ? 'Describe the bug: what happened, what you expected, and steps to reproduce...' :
                    type === 'issue'      ? 'Describe the issue you encountered...' :
                                           'Share your idea or suggestion for improving BusinessTalk24...'
                  }
                  className="w-full px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all text-sm"
                  style={{ backgroundColor: '#F8F9FA', border: '1px solid #E8E8E8', color: '#212529' }}
                  onFocus={e => (e.currentTarget.style.outlineColor = '#1976D2')}
                />
              </div>

              {/* Selected type badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: `${selected.color}15`, color: selected.color }}>
                  {selected.label}
                </span>
                <span className="text-xs" style={{ color: '#5F6368' }}>will be submitted</span>
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: '#212529' }}
                onMouseEnter={e => { if (!loading && message.trim()) e.currentTarget.style.backgroundColor = '#3D3D3D' }}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#212529')}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>

            {/* Contact info */}
            <div className="bg-white rounded-2xl border p-5" style={{ border: '1px solid #E8E8E8' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#212529' }}>Need urgent help?</p>
              <p className="text-sm" style={{ color: '#5F6368' }}>
                Email us directly at{' '}
                <a href={SUPPORT_MAILTO} className="font-medium transition-colors underline"
                  style={{ color: '#1976D2' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1565C0')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#1976D2')}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
