import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { upsertPlanOverride } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  planId?: unknown
  fixedPriceUsd?: unknown
  reason?: unknown
  isActive?: unknown
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  if (typeof body.planId !== 'string' || !body.planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 })
  }
  if (typeof body.fixedPriceUsd !== 'number' || !Number.isFinite(body.fixedPriceUsd) || body.fixedPriceUsd < 0) {
    return NextResponse.json({ error: 'fixedPriceUsd must be a non-negative number' }, { status: 400 })
  }

  try {
    const rule = await upsertPlanOverride(
      {
        planId: body.planId,
        fixedPriceUsd: Math.round(body.fixedPriceUsd * 100) / 100,
        reason: typeof body.reason === 'string' ? body.reason : body.reason === null ? null : undefined,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      },
      actorMeta(req, guard.session),
    )
    return NextResponse.json({ rule: { ...rule, fixedPriceUsd: Number(rule.fixedPriceUsd) } }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/admin/pricing/override]', e)
    return NextResponse.json({ error: 'Failed to upsert plan override' }, { status: 500 })
  }
}
