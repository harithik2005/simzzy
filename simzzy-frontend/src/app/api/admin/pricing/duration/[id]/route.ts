import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteDurationRule, updateDurationRule, type UpdateDurationInput } from 'simzzy-backend'
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

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const patch: UpdateDurationInput = {}
  if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label.trim()
  if (typeof body.minDays === 'number' && Number.isInteger(body.minDays) && body.minDays >= 1) patch.minDays = body.minDays
  if (body.maxDays === null) patch.maxDays = null
  else if (typeof body.maxDays === 'number' && Number.isInteger(body.maxDays) && body.maxDays >= 1) patch.maxDays = body.maxDays
  if (typeof body.profitUsd === 'number' && Number.isFinite(body.profitUsd) && body.profitUsd >= 0) {
    patch.profitUsd = Math.round(body.profitUsd * 100) / 100
  }
  if (typeof body.isActive === 'boolean') patch.isActive = body.isActive

  try {
    const rule = await updateDurationRule(id, patch, actorMeta(req, guard.session))
    if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    return NextResponse.json({ rule: { ...rule, profitUsd: Number(rule.profitUsd) } })
  } catch (e) {
    console.error(`[PUT /api/admin/pricing/duration/${id}]`, e)
    return NextResponse.json({ error: 'Failed to update duration rule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  try {
    const before = await deleteDurationRule(id, actorMeta(req, guard.session))
    if (!before) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`[DELETE /api/admin/pricing/duration/${id}]`, e)
    return NextResponse.json({ error: 'Failed to delete duration rule' }, { status: 500 })
  }
}
