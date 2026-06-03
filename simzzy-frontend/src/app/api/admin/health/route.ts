import { NextResponse } from 'next/server'
import { runHealthChecks } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  try {
    const report = await runHealthChecks()
    return NextResponse.json(report)
  } catch (e) {
    console.error('[GET /api/admin/health]', e)
    return NextResponse.json({ error: 'Failed to run health checks' }, { status: 500 })
  }
}
