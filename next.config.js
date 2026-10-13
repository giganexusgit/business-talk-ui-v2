/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      // Direct root visitors to dashboard feed instead of login page
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
      // Backend reset-password email links arrive as /auth/reset-password?token=...
      // Redirect them to our frontend reset-password page (preserves query string)
      {
        source: '/auth/reset-password',
        destination: '/reset-password',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
