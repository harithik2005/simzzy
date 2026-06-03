import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deletePlanOverride, prisma, upsertPlanOverride } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { fixedPriceUsd?: unknown; reason?: unknown; isActive?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const existing = await prisma.planPriceOverride.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Override not found' }, { status: 404 })

  const fixedPriceUsd =
    typeof body.fixedPriceUsd === 'number' && Number.isFinite(body.fixedPriceUsd) && body.fixedPriceUsd >= 0
      ? Math.round(body.fixedPriceUsd * 100) / 100
      : Number(existing.fixedPriceUsd)

  try {
    const rule = await upsertPlanOverride(
      {
        planId: existing.planId,
        fixedPriceUsd,
        reason: typeof body.reason === 'string' ? body.reason : body.reason === null ? null : undefined,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : existing.isActive,
      },
      actorMeta(req, guard.session),
    )
    return NextResponse.json({ rule: { ...rule, fixedPriceUsd: Number(rule.fixedPriceUsd) } })
  } catch (e) {
    console.error(`[PUT /api/admin/pricing/override/${id}]`, e)
    return NextResponse.json({ error: 'Failed to update plan override' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const { id } = await ctx.params
  try {
    const before = await deletePlanOverride(id, actorMeta(req, guard.session))
    if (!before) return NextResponse.json({ error: 'Override not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`[DELETE /api/admin/pricing/override/${id}]`, e)
    return NextResponse.json({ error: 'Failed to delete plan override' }, { status: 500 })
  }
}
