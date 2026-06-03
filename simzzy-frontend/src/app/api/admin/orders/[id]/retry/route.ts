import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ActorType } from '@prisma/client'
import { retryOrder, OrderNotFoundError, OrderValidationError } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  const meta = actorMeta(req, guard.session)
  try {
    const order = await retryOrder(id, {
      actorId: guard.session.user.id as string,
      actorType: ActorType.ADMIN,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    return NextResponse.json({ order })
  } catch (e) {
    if (e instanceof OrderValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    if (e instanceof OrderNotFoundError)   return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    console.error(`[POST /api/admin/orders/${id}/retry]`, e)
    return NextResponse.json({ error: 'Failed to retry order' }, { status: 500 })
  }
}
