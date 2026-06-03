import { NextResponse } from 'next/server'
import { getAdminDashboardSummary } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  try {
    const summary = await getAdminDashboardSummary()
    return NextResponse.json({ summary })
  } catch (e) {
    console.error('[GET /api/admin/dashboard]', e)
    return NextResponse.json({ error: 'Failed to load admin dashboard' }, { status: 500 })
  }
}
