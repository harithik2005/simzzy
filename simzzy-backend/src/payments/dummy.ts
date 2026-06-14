import { ActorType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { transitionStatus } from '../orders/service'

/**
 * Dummy payment provider.
 *
 * Used by checkout while we don't have a real gateway. The flow mirrors what a
 * real PSP integration will look like:
 *
 *   startDummyPayment(orderId)
 *     → creates a Payment(PENDING) row
 *     → transitions Order PENDING → PAYMENT_PROCESSING
 *     → records a `dummy.intent_created` PaymentEvent
 *
 *   confirmDummyPayment(paymentId, succeed?)
 *     → if succeed (default true):
 *         - Payment → SUCCESS, paidAt set
 *         - Order   → PAYMENT_SUCCESS → ORDER_SUBMITTED → DELIVERED
 *         - `dummy.captured` event
 *       else:
 *         - Payment → FAILED with failureReason
 *         - Order   → FAILED
 *         - `dummy.failed` event
 *
 * No external network calls. No card data is ever accepted by this module.
 */

const DUMMY_PROVIDER_SLUG = 'dummy'

export class PaymentNotFoundError extends Error { readonly code = 'PAYMENT_NOT_FOUND' as const }
export class PaymentStateError   extends Error { readonly code = 'PAYMENT_STATE'    as const }

function dec(n: number): Prisma.Decimal { return new Prisma.Decimal(n.toFixed(4)) }

async function getDummyProviderId(): Promise<string> {
  const p = await prisma.paymentProvider.findUnique({ where: { slug: DUMMY_PROVIDER_SLUG } })
  if (!p) throw new Error('Dummy payment provider missing from `payment_providers` — re-run seed.')
  return p.id
}

export type StartPaymentArgs = {
  orderId: string
  method?: string // 'card' | 'upi' | 'netbanking' | 'wallet'
  actor: { actorId: string | null; ip?: string | null; userAgent?: string | null }
}

export async function startDummyPayment(args: StartPaymentArgs) {
  const order = await prisma.order.findUnique({
    where: { id: args.orderId },
    select: { id: true, status: true, currency: true, localTotal: true, deletedAt: true },
  })
  if (!order || order.deletedAt) throw new PaymentNotFoundError('Order not found')
  if (order.status !== OrderStatus.PENDING) {
    throw new PaymentStateError(`Order is in ${order.status} — cannot start a fresh payment`)
  }

  const providerId = await getDummyProviderId()

  // 1. Payment row + intent event.
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      providerId,
      amount: order.localTotal,
      currency: order.currency,
      method: args.method ?? 'card',
      status: PaymentStatus.PENDING,
      events: {
        create: {
          eventType: 'dummy.intent_created',
          payload: { source: 'dummy', method: args.method ?? 'card' },
          signatureVerified: true, // dummy provider — implicitly trusted
        },
      },
    },
  })

  // 2. Move the order forward.
  await transitionStatus(order.id, OrderStatus.PAYMENT_PROCESSING, {
    actorId: args.actor.actorId,
    actorType: args.actor.actorId ? ActorType.USER : ActorType.SYSTEM,
    reason: 'Dummy payment intent created',
  })

  // amount/currency are returned so the caller can feed the gateway's
  // authorize() without re-querying the order.
  return {
    paymentId: payment.id,
    status: PaymentStatus.PENDING,
    amount: Number(order.localTotal),
    currency: order.currency,
  }
}

export type ConfirmPaymentArgs = {
  paymentId: string
  succeed?: boolean // default true; false simulates a declined payment
  failureReason?: string
  /** Gateway transaction reference, stored as `Payment.gatewayPaymentId`. */
  transactionRef?: string
  actor: { actorId: string | null; ip?: string | null; userAgent?: string | null }
  /**
   * When true, the success path stops at ORDER_SUBMITTED instead of walking the
   * dummy QR_RECEIVED → DELIVERED steps — the caller then runs real provider
   * fulfilment (Phase 4H.2B). Used when TSIM_FULFILMENT_ENABLED is on.
   */
  holdForFulfilment?: boolean
}

export async function confirmDummyPayment(args: ConfirmPaymentArgs) {
  const succeed = args.succeed ?? true
  const payment = await prisma.payment.findUnique({
    where: { id: args.paymentId },
    select: { id: true, orderId: true, status: true, amount: true },
  })
  if (!payment) throw new PaymentNotFoundError('Payment not found')
  if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
    throw new PaymentStateError(`Payment already ${payment.status}`)
  }

  if (!succeed) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: args.failureReason ?? 'Dummy provider declined',
        ...(args.transactionRef ? { gatewayPaymentId: args.transactionRef } : {}),
        events: { create: { eventType: 'dummy.failed', payload: { reason: args.failureReason ?? 'declined', transactionRef: args.transactionRef ?? null } } },
      },
    })
    await transitionStatus(payment.orderId, OrderStatus.FAILED, {
      actorId: args.actor.actorId,
      actorType: args.actor.actorId ? ActorType.USER : ActorType.SYSTEM,
      reason: 'Dummy payment failed',
    })
    return { paymentStatus: PaymentStatus.FAILED, orderStatus: OrderStatus.FAILED }
  }

  // Success path: capture → submit → deliver. We collapse the three internal
  // statuses (PAYMENT_SUCCESS → ORDER_SUBMITTED → DELIVERED) into a sequence so
  // the timeline shows each step. Real provider integration in Phase 4H will
  // hold at ORDER_SUBMITTED until tSIM responds with a QR.
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
      ...(args.transactionRef ? { gatewayPaymentId: args.transactionRef } : {}),
      events: { create: { eventType: 'dummy.captured', payload: { amount: Number(payment.amount), transactionRef: args.transactionRef ?? null } } },
    },
  })

  const sysActor = {
    actorId: args.actor.actorId,
    actorType: args.actor.actorId ? ActorType.USER : ActorType.SYSTEM,
  } as const

  await transitionStatus(payment.orderId, OrderStatus.PAYMENT_SUCCESS, { ...sysActor, reason: 'Dummy payment captured' })
  await transitionStatus(payment.orderId, OrderStatus.ORDER_SUBMITTED, { ...sysActor, reason: 'Order queued for fulfilment' })

  // Real provider hand-off (Phase 4H.2B): stop here and let the caller run
  // tSIM fulfilment, which will move QR_PENDING → QR_RECEIVED → DELIVERED.
  if (args.holdForFulfilment) {
    void dec
    return { paymentStatus: PaymentStatus.SUCCESS, orderStatus: OrderStatus.ORDER_SUBMITTED }
  }

  // Dummy fulfilment: walk through QR_RECEIVED before DELIVERED so the timeline
  // mirrors what real tSIM integration looks like.
  await transitionStatus(payment.orderId, OrderStatus.QR_RECEIVED, { ...sysActor, reason: 'QR code generated (dummy provider)' })
  await transitionStatus(payment.orderId, OrderStatus.DELIVERED, { ...sysActor, reason: 'eSIM delivered to customer email (dummy fulfilment)' })

  void dec // silence unused if no Decimal needed here
  return { paymentStatus: PaymentStatus.SUCCESS, orderStatus: OrderStatus.DELIVERED }
}
