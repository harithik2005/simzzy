import type { Metadata } from 'next'
import { Outfit, Space_Mono } from 'next/font/google'
import '../styles/globals.css'
import { Providers } from './providers'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
})

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  weight: ['400', '700'],
  subsets: ['latin'],
})

const SITE_URL = 'https://simzzy.com'
const SITE_DESC =
  'Get instant eSIM data plans for travel. Connect to 4G/5G networks in 150+ countries with no roaming fees.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Simzzy – Instant eSIM for 150+ Countries',
    template: '%s · Simzzy',
  },
  description: SITE_DESC,
  keywords: ['eSIM', 'travel eSIM', 'international data', 'roaming', 'prepaid data plan', 'tSIM'],
  applicationName: 'Simzzy',
  authors: [{ name: 'Simzzy' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Simzzy',
    title: 'Simzzy – Instant eSIM for 150+ Countries',
    description: SITE_DESC,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simzzy – Instant eSIM for 150+ Countries',
    description: SITE_DESC,
    creator: '@simzzy',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${outfit.variable} ${spaceMono.variable}`}>
      <body className="bg-deep text-primary min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
