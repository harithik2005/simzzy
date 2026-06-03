import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma, cancelOrder, IllegalTransitionError, OrderNotFoundError } from 'simzzy-backend'
import { actorMeta, requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  const { id } = await ctx.params
  const owned = await prisma.order.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const meta = actorMeta(req, guard.session)
  try {
    const order = await cancelOrder(id, { actorId: userId, ip: meta.ip, userAgent: meta.userAgent, reason: 'Cancelled by customer' })
    return NextResponse.json({ order })
  } catch (e) {
    if (e instanceof IllegalTransitionError) {
      return NextResponse.json({ error: 'Order can no longer be cancelled' }, { status: 409 })
    }
    if (e instanceof OrderNotFoundError) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    console.error(`[POST /api/orders/${id}/cancel]`, e)
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 })
  }
}
