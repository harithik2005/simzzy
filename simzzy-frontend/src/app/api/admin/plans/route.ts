import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPlanFilterOptions, listAdminPlans, type PlanFilters } from 'simzzy-backend'
import { adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: PlanFilters = {}
  const q = sp.get('q'); if (q) filters.q = q
  const providerId = sp.get('providerId'); if (providerId) filters.providerId = providerId
  const regionId = sp.get('regionId'); if (regionId) filters.regionId = regionId
  const active = sp.get('active')
  if (active === 'true') filters.active = true
  else if (active === 'false') filters.active = false

  try {
    const [plans, options] = await Promise.all([listAdminPlans(filters), getPlanFilterOptions()])
    return NextResponse.json({ plans, options })
  } catch (e) {
    return adminErrorResponse(e, '[GET /api/admin/plans]')
  }
}
