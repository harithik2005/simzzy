import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Dashboard',
  description: 'Manage your orders, active eSIMs, and account settings.',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
