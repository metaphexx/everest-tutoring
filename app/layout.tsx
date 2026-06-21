import type { Metadata, Viewport } from 'next'
import './globals.css'
import FacebookPixel from '@/components/analytics/FacebookPixel'
import ScrollPerf from '@/components/perf/ScrollPerf'
import { Toaster } from '@/components/ui/toaster'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://everesttutoring.com.au'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Everest Tutoring × Harrisdale SHS | After-School Tutoring',
    template: '%s | Everest Tutoring',
  },
  description:
    'On-campus after-school tutoring at Harrisdale Senior High School. Small-group Year 8–10 Maths, English and Science, aligned to the HSHS course outlines. Enrol online for Term 3.',
  keywords: [
    'tutoring', 'Harrisdale tutoring', 'after-school tutoring', 'Harrisdale Senior High School',
    'HSHS', 'maths tutoring Perth', 'english tutoring', 'science tutoring', 'Year 8', 'Year 9',
    'Year 10', 'Perth tutoring', 'small group tutoring', 'on-campus tutoring',
  ],
  applicationName: 'Everest Tutoring',
  authors: [{ name: 'Everest Tutoring' }],
  creator: 'Everest Tutoring',
  publisher: 'Everest Tutoring',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Everest Tutoring × Harrisdale SHS',
    description:
      'Small-group after-school tutoring on campus at Harrisdale SHS - Maths, English and Science for Years 8–10, aligned to the school’s course outlines.',
    url: SITE_URL,
    siteName: 'Everest Tutoring',
    type: 'website',
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Everest Tutoring × Harrisdale SHS',
    description: 'On-campus after-school tutoring for Harrisdale students. Years 8–10, Maths, English & Science.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.ico', apple: '/logo.png' },
  category: 'education',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#009dff',
}

// Local-business / education structured data for rich results + local SEO.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['EducationalOrganization', 'LocalBusiness'],
  name: 'Everest Tutoring',
  description:
    'On-campus after-school tutoring at Harrisdale Senior High School: small-group Year 8–10 Maths, English and Science, aligned to the HSHS course outlines.',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/campus.jpg`,
  email: 'info@everesttutoring.com.au',
  priceRange: '$$',
  areaServed: { '@type': 'City', name: 'Perth' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Harrisdale Senior High School, Wright Road',
    addressLocality: 'Harrisdale',
    addressRegion: 'WA',
    postalCode: '6112',
    addressCountry: 'AU',
  },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '200', bestRating: '5' },
  identifier: { '@type': 'PropertyValue', propertyID: 'ABN', value: '39 601 405 047' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className="h-full scroll-smooth" data-scroll-behavior="smooth">
      <body className="min-h-full antialiased">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <FacebookPixel />
        <ScrollPerf />
        <Toaster />
      </body>
    </html>
  )
}
