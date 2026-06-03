import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listAuditEntities, listAuditLog, type AuditFilters } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: AuditFilters = {}
  const entity = sp.get('entity'); if (entity) filters.entity = entity
  const actorId = sp.get('actorId'); if (actorId) filters.actorId = actorId
  const actorQuery = sp.get('q'); if (actorQuery) filters.actorQuery = actorQuery
  const dateFrom = sp.get('dateFrom'); if (dateFrom) filters.dateFrom = dateFrom
  const dateTo = sp.get('dateTo'); if (dateTo) filters.dateTo = dateTo

  try {
    const entries = await listAuditLog(filters, Number(sp.get('limit')) || 100)
    const entities = await listAuditEntities()
    return NextResponse.json({ entries, entities })
  } catch (e) {
    console.error('[GET /api/admin/audit]', e)
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 })
  }
}
