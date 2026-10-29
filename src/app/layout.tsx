import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import '@/app/globals.css'
import { Providers } from '@/app/providers'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://businesstalk24.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BusinessTalk24 - Professional Networking Platform',
    template: '%s | BusinessTalk24',
  },
  description: 'Connect, collaborate, and grow your business with BusinessTalk24. Share business insights, explore Q&A, and network with professionals worldwide.',
  keywords: 'networking, business, professional, collaboration, business discussion, entrepreneurship, Q&A, business stories',
  authors: [{ name: 'BusinessTalk24' }],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: '-1XYv6pI5QBKm7fpxA-TGTDZa2JjrF475yeg00Ssu04',
  },
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
    url: siteUrl,
    title: 'BusinessTalk24 - Professional Networking Platform',
    description: 'Connect, collaborate, and grow your business with BusinessTalk24.',
    siteName: 'BusinessTalk24',
    images: [
      {
        url: '/assets/logos/BUSINESSTALK24_LOGO_png.png',
        width: 1200,
        height: 630,
        alt: 'BusinessTalk24 Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BusinessTalk24 - Professional Networking Platform',
    description: 'Connect, collaborate, and grow your business with BusinessTalk24.',
    images: ['/assets/logos/BUSINESSTALK24_LOGO_png.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://businesstalk24.com/#organization',
      name: 'BusinessTalk24',
      alternateName: ['Business Talk 24', 'Businesstalk24'],
      url: 'https://businesstalk24.com/',
      logo: {
        '@type': 'ImageObject',
        '@id': 'https://businesstalk24.com/#logo',
        url: 'https://businesstalk24.com/assets/logos/BUSINESSTALK24_LOGO_png.png',
        caption: 'BusinessTalk24 Logo',
      },
      description: 'BusinessTalk24 is a professional networking and business community platform to connect, collaborate, engage in business Q&A discussions, share stories, and grow your business.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://businesstalk24.com/#website',
      url: 'https://businesstalk24.com/',
      name: 'BusinessTalk24',
      description: 'Professional Networking Platform',
      publisher: {
        '@id': 'https://businesstalk24.com/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://businesstalk24.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="h-screen">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7DF02FEEY8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-7DF02FEEY8');
          `}
        </Script>

        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
