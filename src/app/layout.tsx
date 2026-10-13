import type { Metadata, Viewport } from 'next'
import '@/app/globals.css'
import { Providers } from '@/app/providers'

export const metadata: Metadata = {
  title: 'Businesstalk24 - Professional Networking Platform',
  description: 'Connect, collaborate, and grow your business with Businesstalk24',
  keywords: 'networking, business, professional, collaboration',
  authors: [{ name: 'Businesstalk24' }],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/assets/icons/BUSINESSTALK24_LOGO_Icon_png.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://businesstalk24.com',
    title: 'Businesstalk24',
    description: 'Connect, collaborate, and grow your business',
    images: [
      {
        url: '/assets/logos/BUSINESSTALK24_LOGO_png.png',
        width: 1200,
        height: 630,
        alt: 'Businesstalk24',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// function syncAccessTokenCookieToLocalStorage() {
//   if (typeof window !== 'undefined') {
//     const match = document.cookie.match(new RegExp('(^| )access_token=([^;]+)'));
//     const cookieToken = match ? decodeURIComponent(match[2]) : null;
//     if (cookieToken && !localStorage.getItem('auth_token')) {
//       localStorage.setItem('auth_token', cookieToken);
//     }
//   }
// }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
