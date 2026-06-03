import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  prisma,
  startDummyPayment,
  confirmDummyPayment,
  PaymentNotFoundError,
  PaymentStateError,
} from 'simzzy-backend'
import { actorMeta, requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/[id]/pay — drives the dummy payment in one round-trip.
 *
 * Body: `{ method?: 'card' | 'upi' | 'netbanking' | 'wallet', succeed?: boolean }`
 *
 * The route enforces ownership (the order must belong to the calling user),
 * then runs:
 *   1. `startDummyPayment` — Payment(PENDING) + Order(PAYMENT_PROCESSING)
 *   2. `confirmDummyPayment` — Payment(SUCCESS|FAILED) + final Order status
 *
 * Returns the resulting payment + order status so the frontend can stop showing
 * the spinner. `succeed=false` (or `?fail=1`) simulates a decline for tests.
 */

type Body = { method?: unknown; succeed?: unknown; failureReason?: unknown }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  const { id } = await ctx.params
  let body: Body = {}
  try { body = (await req.json()) as Body } catch { /* empty body is fine */ }

  // Ownership check before any side effects.
  const owned = await prisma.order.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const meta = actorMeta(req, guard.session)
  const actor = { actorId: userId, ip: meta.ip, userAgent: meta.userAgent }

  const method = typeof body.method === 'string' ? body.method : 'card'
  const succeed = typeof body.succeed === 'boolean' ? body.succeed : true
  const failureReason = typeof body.failureReason === 'string' ? body.failureReason : undefined

  try {
    const intent = await startDummyPayment({ orderId: id, method, actor })
    const result = await confirmDummyPayment({ paymentId: intent.paymentId, succeed, failureReason, actor })
    return NextResponse.json({
      paymentId: intent.paymentId,
      paymentStatus: result.paymentStatus,
      orderStatus: result.orderStatus,
    })
  } catch (e) {
    if (e instanceof PaymentNotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof PaymentStateError)    return NextResponse.json({ error: e.message }, { status: 409 })
    console.error(`[POST /api/orders/${id}/pay]`, e)
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}
