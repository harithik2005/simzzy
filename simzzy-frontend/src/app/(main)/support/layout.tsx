import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help & Support',
  description:
    'Find answers about installing your eSIM, payments, coverage, and account settings — or chat with our 24/7 AI assistant.',
  alternates: { canonical: '/support' },
  openGraph: {
    title: 'Help & Support · Simzzy',
    description: 'Answers about eSIM installation, payments, coverage, and your account.',
    url: 'https://simzzy.com/support',
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
