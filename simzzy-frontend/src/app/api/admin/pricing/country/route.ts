import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { upsertCountryRule } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { countryId?: unknown; profitUsd?: unknown; isActive?: unknown }

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  if (typeof body.countryId !== 'string' || !body.countryId) {
    return NextResponse.json({ error: 'countryId is required' }, { status: 400 })
  }
  if (typeof body.profitUsd !== 'number' || !Number.isFinite(body.profitUsd) || body.profitUsd < 0) {
    return NextResponse.json({ error: 'profitUsd must be a non-negative number' }, { status: 400 })
  }

  try {
    const rule = await upsertCountryRule(
      {
        countryId: body.countryId,
        profitUsd: Math.round(body.profitUsd * 100) / 100,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      },
      actorMeta(req, guard.session),
    )
    return NextResponse.json({ rule: { ...rule, profitUsd: Number(rule.profitUsd) } }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/admin/pricing/country]', e)
    return NextResponse.json({ error: 'Failed to upsert country rule' }, { status: 500 })
  }
}
