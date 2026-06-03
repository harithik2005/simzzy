import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ProviderStatus } from '@prisma/client'
import { setPaymentProviderStatus } from 'simzzy-backend'
import { actorMeta, requireSuperAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { status?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Provider configuration is a production toggle — SUPER_ADMIN only.
  const guard = await requireSuperAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.status !== 'string' || !(Object.values(ProviderStatus) as string[]).includes(body.status)) {
    return NextResponse.json({ error: 'status must be ACTIVE or INACTIVE' }, { status: 400 })
  }
  const meta = actorMeta(req, guard.session)
  try {
    const provider = await setPaymentProviderStatus(id, body.status as ProviderStatus, {
      actorId: guard.session.user.id as string,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    return NextResponse.json({ provider })
  } catch (e) {
    console.error(`[PUT /api/admin/providers/payment/${id}]`, e)
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 })
  }
}
