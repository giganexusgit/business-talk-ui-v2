'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCompleteProfile = pathname?.includes('complete-profile')

  if (isCompleteProfile) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#0F1419] flex flex-col justify-between">
        {/* Top Minimalist Header */}
        <header className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-30 shadow-xs">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition">
              <img
                src="/assets/logos/BUSINESSTALK24_LOGO_png.png"
                alt="BusinessTalk24"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-black text-white">
                Step 2 of 2
              </span>
              <span className="text-xs font-medium text-gray-500 hidden sm:inline">
                Profile Setup
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-10">
          {children}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-gray-200 py-4 bg-white text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} BusinessTalk24. All rights reserved.</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e8ecf0 100%)' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-14 py-12 relative overflow-hidden">
        {/* subtle decorative circle */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #212529 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #212529 0%, transparent 70%)' }} />

        <div className="relative max-w-lg">
          {/* Logo / brand name */}
          <p className="text-3xl font-bold tracking-widest uppercase" style={{ color: '#000000', letterSpacing: '1px' }}>
            Welcome to
          </p>
          <p className="text-5xl font-bold uppercase mb-8" style={{ color: '#000000', lineHeight: '2.25rem' }}>  {/* tracking-widest */}
            Businesstalk24
          </p>

          {/* Hero tagline — 3 large words */}
          <div className="space-y-2 mb-8">
            {['Ask.', 'Share.', 'Contribute.'].map((word) => (
              <h1
                key={word}
                className="font-black leading-none tracking-tight"
                style={{ fontSize: 'clamp(4rem, 7vw, 8.5rem)', color: '#000000', marginBottom: '0.5rem', marginTop: '-0.5rem' }}
              >
                {word}
              </h1>
            ))}
          </div>

          <p className="text-base leading-relaxed" style={{ color: '#5F6368', maxWidth: '27rem' , lineHeight: '1.25rem', marginTop: '-1rem' }}>
            Ask business questions, share your experiences, and contribute to meaningful professional discussions.
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12 lg:py-0">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
