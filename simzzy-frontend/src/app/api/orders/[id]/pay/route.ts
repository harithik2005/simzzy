import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  prisma,
  startDummyPayment,
  confirmDummyPayment,
  getPaymentGateway,
  fulfilOrderViaTsim,
  PaymentNotFoundError,
  PaymentStateError,
  type CardDetails,
} from 'simzzy-backend'
import { actorMeta, requireUserApi } from '@/lib/api-guards'

// Phase 4H.2B: when "true", a successful payment triggers a REAL tSIM eSIM
// purchase + QR. Default off → the dummy fulfilment runs (no real provider call).
const TSIM_FULFILMENT_ENABLED = process.env.TSIM_FULFILMENT_ENABLED === 'true'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/[id]/pay — drives the payment in one round-trip.
 *
 * Body: `{ method?: 'card', card?: { number, name, expiry, cvv } }`
 *
 * The route enforces ownership (the order must belong to the calling user),
 * then runs:
 *   1. `startDummyPayment` — Payment(PENDING) + Order(PAYMENT_PROCESSING)
 *   2. `gateway.authorize(card)` — the active provider (PAYMENT_PROVIDER) decides
 *      success/failure. In test mode the FakePaymentProvider validates the card
 *      against the single accepted test card; success is NOT client-controlled.
 *   3. `confirmDummyPayment` — Payment(SUCCESS|FAILED) + transaction ref + final
 *      order status.
 *
 * Returns the resulting payment + order status (and, on decline, a customer-
 * facing `failureReason`) so the frontend can show the result and offer retry.
 */

type CardBody = { number?: unknown; name?: unknown; expiry?: unknown; cvv?: unknown }
type Body = { method?: unknown; card?: CardBody }

function parseCard(raw: unknown): CardDetails | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const c = raw as CardBody
  return {
    number: typeof c.number === 'string' ? c.number : '',
    name: typeof c.name === 'string' ? c.name : '',
    expiry: typeof c.expiry === 'string' ? c.expiry : '',
    cvv: typeof c.cvv === 'string' ? c.cvv : '',
  }
}

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
  const card = parseCard(body.card)

  try {
    const gateway = getPaymentGateway()

    // 1. Open the payment intent (Payment PENDING + Order PAYMENT_PROCESSING).
    const intent = await startDummyPayment({ orderId: id, method, actor })

    // 2. Provider decides — success is server-authoritative (card validation).
    const auth = await gateway.authorize({
      amount: intent.amount,
      currency: intent.currency,
      method,
      card,
    })
    const succeed = auth.ok

    // 3. Capture or decline, recording the gateway transaction reference.
    const result = await confirmDummyPayment({
      paymentId: intent.paymentId,
      succeed,
      failureReason: auth.failureReason,
      transactionRef: auth.transactionRef,
      actor,
      // Hold at ORDER_SUBMITTED so real fulfilment can take over (when enabled).
      holdForFulfilment: TSIM_FULFILMENT_ENABLED && succeed,
    })

    // Real tSIM fulfilment: subscribe → poll for QR → create eSIM → DELIVERED.
    // (When the flag is on and payment succeeded, the order is held at ORDER_SUBMITTED.)
    if (TSIM_FULFILMENT_ENABLED && succeed) {
      const fr = await fulfilOrderViaTsim(id, { actorId: userId })
      return NextResponse.json({
        paymentId: intent.paymentId,
        paymentStatus: result.paymentStatus,
        orderStatus: fr.orderStatus,
        transactionRef: auth.transactionRef,
        fulfilment: fr.ok ? 'success' : 'failed',
        ...(fr.error ? { fulfilmentError: fr.error } : {}),
      })
    }

    return NextResponse.json({
      paymentId: intent.paymentId,
      paymentStatus: result.paymentStatus,
      orderStatus: result.orderStatus,
      transactionRef: auth.transactionRef,
      ...(succeed ? {} : { failureReason: auth.failureReason, failureCode: auth.code }),
    })
  } catch (e) {
    if (e instanceof PaymentNotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
    if (e instanceof PaymentStateError)    return NextResponse.json({ error: e.message }, { status: 409 })
    console.error(`[POST /api/orders/${id}/pay]`, e)
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}
