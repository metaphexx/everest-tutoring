import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://everesttutoring.com.au'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private / transactional / auth-gated areas out of search results.
      disallow: [
        '/admin', '/tutor', '/dashboard', '/account', '/partner', '/api',
        '/claim', '/confirmation', '/book/thank-you', '/login', '/check-email',
        '/messages', '/requests', '/reports',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
