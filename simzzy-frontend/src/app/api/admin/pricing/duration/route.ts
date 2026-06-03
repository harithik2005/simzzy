import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createDurationRule } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  label?: unknown
  minDays?: unknown
  maxDays?: unknown
  profitUsd?: unknown
  isActive?: unknown
}

function parse(body: Body):
  | { label: string; minDays: number; maxDays: number | null; profitUsd: number; isActive?: boolean }
  | string {
  if (typeof body.label !== 'string' || !body.label.trim()) return 'label is required'
  if (typeof body.minDays !== 'number' || !Number.isInteger(body.minDays) || body.minDays < 1) return 'minDays must be an integer ≥ 1'
  const maxDays =
    body.maxDays === null || body.maxDays === undefined
      ? null
      : typeof body.maxDays === 'number' && Number.isInteger(body.maxDays) && body.maxDays >= body.minDays
        ? body.maxDays
        : null
  if (body.maxDays !== null && body.maxDays !== undefined && maxDays === null) return 'maxDays must be an integer ≥ minDays, or null'
  if (typeof body.profitUsd !== 'number' || !Number.isFinite(body.profitUsd) || body.profitUsd < 0) return 'profitUsd must be a non-negative number'

  return {
    label: body.label.trim(),
    minDays: body.minDays,
    maxDays,
    profitUsd: Math.round(body.profitUsd * 100) / 100,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = parse(body)
  if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 })

  try {
    const rule = await createDurationRule(parsed, actorMeta(req, guard.session))
    return NextResponse.json({ rule: { ...rule, profitUsd: Number(rule.profitUsd) } }, { status: 201 })
  } catch (e) {
    console.error('[POST /api/admin/pricing/duration]', e)
    return NextResponse.json({ error: 'Failed to create duration rule' }, { status: 500 })
  }
}
