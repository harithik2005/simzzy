import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listPricingAuditLog } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const limit = Number(req.nextUrl.searchParams.get('limit')) || 50

  try {
    const entries = await listPricingAuditLog(limit)
    return NextResponse.json({ entries })
  } catch (e) {
    console.error('[GET /api/admin/pricing/audit]', e)
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 })
  }
}
