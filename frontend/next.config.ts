import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  // Prevent bundling large/heavy packages into serverless functions
  serverExternalPackages: ['@google/genai', '@mozilla/readability', 'jsdom', 'puppeteer', 'puppeteer-core'],

  experimental: {
    // Reduce stale-while-revalidate windows so user-edited data is seen quickly
    staleTimes: {
      dynamic: 30,    // 30s for dynamic routes
      static: 180,    // 3min for static routes
    },
  },

  // Security & caching headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // API routes — never cache
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        // Static assets — cache aggressively
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
