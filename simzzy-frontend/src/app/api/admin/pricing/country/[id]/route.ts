import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteCountryRule, upsertCountryRule, prisma } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { profitUsd?: unknown; isActive?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const existing = await prisma.pricingCountryRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  const profitUsd =
    typeof body.profitUsd === 'number' && Number.isFinite(body.profitUsd) && body.profitUsd >= 0
      ? Math.round(body.profitUsd * 100) / 100
      : Number(existing.profitUsd)

  try {
    const rule = await upsertCountryRule(
      {
        countryId: existing.countryId,
        profitUsd,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : existing.isActive,
      },
      actorMeta(req, guard.session),
    )
    return NextResponse.json({ rule: { ...rule, profitUsd: Number(rule.profitUsd) } })
  } catch (e) {
    console.error(`[PUT /api/admin/pricing/country/${id}]`, e)
    return NextResponse.json({ error: 'Failed to update country rule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  try {
    const before = await deleteCountryRule(id, actorMeta(req, guard.session))
    if (!before) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`[DELETE /api/admin/pricing/country/${id}]`, e)
    return NextResponse.json({ error: 'Failed to delete country rule' }, { status: 500 })
  }
}
