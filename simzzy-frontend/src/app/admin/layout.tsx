import type { Metadata } from 'next'
import AdminShell from '@/components/admin/AdminShell'
import { requireAdmin } from '@/lib/auth-guards'

export const metadata: Metadata = {
  title: 'Admin · Simzzy',
  description: 'Simzzy admin panel',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate (defense-in-depth alongside middleware): ADMIN or SUPER_ADMIN only.
  await requireAdmin()
  return <AdminShell>{children}</AdminShell>
}
