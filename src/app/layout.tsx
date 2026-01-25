import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/auth-provider';
import { FingerprintProvider } from '@/components/providers/fingerprint-provider';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#ffffff' },
  ],
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL)
  : new URL('https://studylens-xi.vercel.app');

export const metadata: Metadata = {
  title: 'StudyLens - AI Visual Learning Companion',
  description:
    'Point your camera at any educational content and get instant AI-powered explanations. Transform studying with real-time visual recognition and personalized learning.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StudyLens',
  },
  keywords: [
    // Primary Keywords
    'AI study assistant',
    'visual learning app',
    'camera to explanation',
    'educational AI',
    'homework helper',

    // Study/Education Keywords
    'study tool',
    'learning companion',
    'education technology',
    'edtech',
    'smart studying',
    'academic assistant',
    'student productivity',
    'exam preparation',
    'homework help',
    'tutoring app',

    // Technical Keywords
    'image recognition learning',
    'AI camera scanner',
    'real-time explanations',
    'machine learning education',
    'computer vision study tool',
    'OCR study assistant',
    'text recognition learning',

    // Use Case Keywords
    'math problem solver camera',
    'science experiment helper',
    'history document scanner',
    'language learning visual',
    'chemistry equation solver',
    'physics formula explainer',
    'biology diagram analyzer',
    'literature text interpreter',

    // Target Audience Keywords
    'student app',
    'college study tool',
    'high school homework',
    'university learning',
    'teacher assistant tool',
    'parent tutoring help',
    'lifelong learning',
    'professional development',

    // Feature Keywords
    'instant explanations',
    'step-by-step solutions',
    'visual content analysis',
    'interactive learning',
    'personalized education',
    'adaptive learning',
    'knowledge reinforcement',
    'study progress tracking',

    // Mobile/App Keywords
    'mobile learning app',
    'PWA education',
    'offline study tool',
    'installable web app',
    'progressive web app education',

    // Trend Keywords
    'AI-powered education 2024',
    'future of learning',
    'smart classroom',
    'digital tutor',
    'virtual study partner',
  ],

  authors: [{ name: 'StudyLens', url: 'https://studylens-xi.vercel.app' }],
  creator: 'StudyLens Team',
  publisher: 'StudyLens',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    type: 'website',
    url: new URL('/', baseUrl).toString(),
    title: 'StudyLens - AI Visual Learning Companion',
    description:
      'Point your camera at any educational content and get instant AI-powered explanations. Transform how you study!',
    siteName: 'StudyLens',
    locale: 'en_US',
    images: [
      {
        url: '/logo.png', // Primary OG image
        width: 1200,
        height: 630,
        alt: 'StudyLens - AI camera scanning educational content with explanations',
      },
      {
        url: '/icon-512.png', // Mobile optimized
        width: 800,
        height: 600,
        alt: 'StudyLens mobile app interface showing camera scan feature',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'StudyLens - AI Visual Learning Companion',
    description:
      'Transform studying with AI! Point your camera at any educational content for instant explanations.',
    creator: '@studylens',
    site: '@studylens',
    images: ['/twitter-card.png'], // 1200x628px recommended
  },

  // Additional metadata for better indexing
  category: 'education',
  applicationName: 'StudyLens',
  verification: {
    // Add when you have verification codes
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },

  // App links for better mobile integration
  appLinks: {
    ios: {
      url: 'https://studylens-xi.vercel.app',
      app_store_id: 'id123456789', // Add when app is in App Store
      app_name: 'StudyLens',
    },
    android: {
      package: 'com.studylens.app',
      app_name: 'StudyLens',
      url: 'https://studylens-xi.vercel.app',
    },
    web: {
      url: 'https://studylens-xi.vercel.app',
      should_fallback: false,
    },
  },

  // Icons for various platforms
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#5bbad5',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Add splash screens for iOS */}

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'StudyLens',
              applicationCategory: 'EducationApplication',
              operatingSystem: 'Web, PWA',
              description:
                'AI-powered visual learning companion that provides instant explanations by scanning educational content',
              url: 'https://studylens.app',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1000',
              },
              featureList: [
                'Camera-based content scanning',
                'AI-powered explanations',
                'Step-by-step solutions',
                'Multi-subject support',
                'Progress tracking',
              ],
            }),
          }}
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash.jpg"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
        />
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Canonical URL */}
        <link rel="canonical" href="https://studylens-xi.vercel.app" />
      </head>
      <body className={`min-h-screen flex flex-col ${inter.className}`}>
        <AuthProvider>
          <FingerprintProvider>
            {children}
            <PWAInstallPrompt />
          </FingerprintProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
