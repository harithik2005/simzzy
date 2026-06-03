import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateGlobalRule } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  profitUsd?: unknown
  isActive?: unknown
  note?: unknown
}

function parseBody(body: Body): { profitUsd: number; isActive?: boolean; note?: string | null } | string {
  if (typeof body.profitUsd !== 'number' || !Number.isFinite(body.profitUsd) || body.profitUsd < 0) {
    return 'profitUsd must be a non-negative number'
  }
  return {
    profitUsd: Math.round(body.profitUsd * 100) / 100,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    note: typeof body.note === 'string' ? body.note : body.note === null ? null : undefined,
  }
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let raw: Body
  try { raw = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = parseBody(raw)
  if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 })

  try {
    const rule = await updateGlobalRule(parsed, actorMeta(req, guard.session))
    return NextResponse.json({ rule: { ...rule, profitUsd: Number(rule.profitUsd) } })
  } catch (e) {
    console.error('[PUT /api/admin/pricing/global]', e)
    return NextResponse.json({ error: 'Failed to update global rule' }, { status: 500 })
  }
}
