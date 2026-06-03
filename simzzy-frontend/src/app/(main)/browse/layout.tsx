import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse eSIM Plans',
  description:
    'Compare instant eSIM data plans across 150+ countries and regions. Filter by data, duration, and price, then activate in minutes.',
  alternates: { canonical: '/browse' },
  openGraph: {
    title: 'Browse eSIM Plans · Simzzy',
    description: 'Compare instant eSIM data plans across 150+ countries and regions.',
    url: 'https://simzzy.com/browse',
  },
}

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children
}
