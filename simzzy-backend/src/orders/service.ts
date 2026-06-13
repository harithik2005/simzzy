import { ActorType, OrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { loadActiveRules, resolveOne } from '../pricing/resolver'
import { getRate } from '../currency/service'
import { assertTransition, IllegalTransitionError, PUBLIC_STATUS } from './state'
import type {
  CreateOrderInput,
  OrderDetailDto,
  OrderListFilters,
  OrderSummaryDto,
} from './types'

/**
 * Order service.
 *
 * createOrder() is the only place where the pricing engine is consulted in the
 * order flow — once written, an OrderItem is an immutable price snapshot
 * (resolved rule, profit, selling price). Later rule changes never re-price an
 * existing order.
 *
 * All status changes go through `transitionStatus()` which validates the move
 * against the state machine in `./state.ts` and atomically writes the new
 * status + an `OrderStatusHistory` row in one transaction.
 */

const ORDER_NUMBER_PREFIX = 'SIM'

export class ValidationError extends Error { readonly code = 'VALIDATION' as const }
export class NotFoundError extends Error { readonly code = 'NOT_FOUND' as const }

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function dec(n: number): Prisma.Decimal { return new Prisma.Decimal(n.toFixed(4)) }

function buildOrderNumber(): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${ORDER_NUMBER_PREFIX}-${today}-${rand}`
}

function summarise(o: {
  id: string
  orderNumber: string
  status: OrderStatus
  currency: string
  usdSubtotal: Prisma.Decimal
  usdDiscount: Prisma.Decimal
  usdTotal: Prisma.Decimal
  localTotal: Prisma.Decimal
  fxRate: Prisma.Decimal
  createdAt: Date
  updatedAt: Date
  customerEmail: string
  customerName: string | null
  items: Array<{ planName: string; data: string; days: number }>
}): OrderSummaryDto {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    publicStatus: PUBLIC_STATUS[o.status],
    currency: o.currency,
    usdSubtotal: Number(o.usdSubtotal),
    usdDiscount: Number(o.usdDiscount),
    usdTotal: Number(o.usdTotal),
    localTotal: Number(o.localTotal),
    fxRate: Number(o.fxRate),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    customerEmail: o.customerEmail,
    customerName: o.customerName,
    itemCount: o.items.length,
    itemSummary:
      o.items.length === 0
        ? '—'
        : o.items.length === 1
          ? `${o.items[0].planName} (${o.items[0].data} · ${o.items[0].days}d)`
          : `${o.items[0].planName} +${o.items.length - 1} more`,
  }
}

/* ─── Create ────────────────────────────────────────────────────────────── */

export async function createOrder(
  userId: string,
  input: CreateOrderInput,
  actor: { actorId: string | null; ip?: string | null; userAgent?: string | null },
): Promise<OrderDetailDto> {
  const planSlug = input.planSlug?.trim()
  if (!planSlug) throw new ValidationError('planSlug is required')
  const email = input.customerEmail?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Valid customerEmail is required')
  }
  const currency = input.currency?.toUpperCase().trim() || 'USD'
  const quantity = Math.max(1, Math.min(10, Math.floor(input.quantity ?? 1)))

  // 1. Look up the plan and resolve current price (snapshot it onto the OrderItem).
  const plan = await prisma.plan.findUnique({
    where: { slug: planSlug },
    include: {
      region: { select: { code: true, name: true } },
      primaryCountry: { select: { name: true } },
    },
  })
  if (!plan || !plan.isActive || plan.deletedAt) {
    throw new NotFoundError(`Plan "${planSlug}" not found or inactive`)
  }

  const rules = await loadActiveRules()
  const breakdown = resolveOne(
    {
      planId: plan.id,
      costUsd: Number(plan.costUsd),
      days: plan.days,
      primaryCountryId: plan.primaryCountryId,
    },
    rules,
  )

  // 2. Lock the FX rate at order creation time.
  const fxRate = await getRate(currency)

  // 3. Roll up totals.
  const subtotalUsd = round2(breakdown.sellingPriceUsd * quantity)
  const discountUsd = Math.max(0, Math.min(subtotalUsd, round2(input.discountUsd ?? 0)))
  const totalUsd = round2(subtotalUsd - discountUsd)
  const localTotal = round2(totalUsd * fxRate)

  const orderNumber = buildOrderNumber()

  // 4. Single transaction: create Order + OrderItem + initial PENDING history row.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        customerEmail: email,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        status: OrderStatus.PENDING,
        currency,
        fxRate: dec(fxRate),
        usdSubtotal: dec(subtotalUsd),
        usdDiscount: dec(discountUsd),
        usdTotal: dec(totalUsd),
        localTotal: dec(localTotal),
        items: {
          create: {
            planId: plan.id,
            planEsimId: plan.esimId,
            planName: plan.name,
            country: plan.primaryCountry?.name ?? null,
            region: plan.region?.name ?? null,
            data: plan.data,
            days: plan.days,
            apn: plan.apn,
            network: plan.network,
            costUsd: dec(breakdown.costUsd),
            profitUsd: dec(breakdown.profitUsd),
            sellingPriceUsd: dec(breakdown.sellingPriceUsd),
            appliedRuleType: breakdown.appliedRule.type,
            appliedRuleLabel: breakdown.appliedRule.label,
            quantity,
          },
        },
        statusHistory: {
          create: {
            toStatus: OrderStatus.PENDING,
            actorId: actor.actorId,
            actorType: actor.actorId ? ActorType.USER : ActorType.SYSTEM,
            reason: 'Order created',
          },
        },
      },
      select: { id: true },
    })
    return created
  })

  const detail = await getOrderDetail(order.id)
  if (!detail) throw new Error('Order disappeared mid-create')
  return detail
}

/* ─── Read ──────────────────────────────────────────────────────────────── */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

const ORDER_SUMMARY_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  currency: true,
  usdSubtotal: true,
  usdDiscount: true,
  usdTotal: true,
  localTotal: true,
  fxRate: true,
  createdAt: true,
  updatedAt: true,
  customerEmail: true,
  customerName: true,
  items: { select: { planName: true, data: true, days: true } },
} satisfies Prisma.OrderSelect

/**
 * Fetch a single order WITHOUT enforcing ownership. Callers that route
 * customer requests must scope with `userId` themselves, or call `getMyOrder`.
 */
export async function getOrderDetail(orderId: string): Promise<OrderDetailDto | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { esim: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payments: {
        orderBy: { createdAt: 'asc' },
        include: { provider: { select: { slug: true } } },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  })
  if (!order || order.deletedAt) return null

  const summary = summarise({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    usdSubtotal: order.usdSubtotal,
    usdDiscount: order.usdDiscount,
    usdTotal: order.usdTotal,
    localTotal: order.localTotal,
    fxRate: order.fxRate,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    items: order.items,
  })

  return {
    ...summary,
    customerPhone: order.customerPhone,
    items: order.items.map((i) => ({
      id: i.id,
      planId: i.planId,
      planName: i.planName,
      planEsimId: i.planEsimId,
      country: i.country,
      region: i.region,
      data: i.data,
      days: i.days,
      apn: i.apn,
      network: i.network,
      costUsd: Number(i.costUsd),
      profitUsd: Number(i.profitUsd),
      sellingPriceUsd: Number(i.sellingPriceUsd),
      appliedRuleType: i.appliedRuleType,
      appliedRuleLabel: i.appliedRuleLabel,
      quantity: i.quantity,
      esim: i.esim
        ? {
            status: i.esim.status,
            iccid: i.esim.iccid,
            qrCodeUrl: i.esim.qrCodeUrl,
            qrCodeData: i.esim.qrCodeData,
            activationCode: i.esim.activationCode,
            smdpAddress: i.esim.smdpAddress,
            apn: i.esim.apn,
          }
        : null,
    })),
    timeline: order.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorId: h.actorId,
      actorType: h.actorType,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amount: Number(p.amount),
      currency: p.currency,
      method: p.method,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      providerSlug: p.provider.slug,
    })),
    user: order.user,
  }
}

/** Customer-scoped read — enforces userId ownership. */
export async function getMyOrder(userId: string, orderId: string): Promise<OrderDetailDto | null> {
  const owned = await prisma.order.findFirst({
    where: { id: orderId, userId, deletedAt: null },
    select: { id: true },
  })
  if (!owned) return null
  return getOrderDetail(orderId)
}

export async function listOrders(filters: OrderListFilters = {}, limit = 100): Promise<OrderSummaryDto[]> {
  const where = buildOrderWhere(filters)
  const rows = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Math.max(1, limit)),
    select: ORDER_SUMMARY_SELECT,
  })
  return rows.map(summarise)
}

function buildOrderWhere(filters: OrderListFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { deletedAt: null }
  const ands: Prisma.OrderWhereInput[] = []

  if (filters.status) ands.push({ status: filters.status })

  if (filters.dateFrom) {
    const d = new Date(filters.dateFrom)
    if (!isNaN(d.getTime())) ands.push({ createdAt: { gte: d } })
  }
  if (filters.dateTo) {
    const d = new Date(filters.dateTo)
    if (!isNaN(d.getTime())) {
      // make `to` inclusive of the whole day
      d.setUTCHours(23, 59, 59, 999)
      ands.push({ createdAt: { lte: d } })
    }
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }

  if (filters.country) {
    ands.push({ items: { some: { country: { equals: filters.country, mode: 'insensitive' } } } })
  }

  if (ands.length) where.AND = ands
  return where
}

/* ─── Transitions ───────────────────────────────────────────────────────── */

export type ActorContext = {
  actorId: string | null
  actorType?: ActorType
  ip?: string | null
  userAgent?: string | null
  reason?: string | null
}

/**
 * Transition an order to a new status, validating the move and appending an
 * `OrderStatusHistory` row in one transaction. Returns the refreshed detail.
 */
export async function transitionStatus(
  orderId: string,
  to: OrderStatus,
  actor: ActorContext,
): Promise<OrderDetailDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, deletedAt: true },
  })
  if (!order || order.deletedAt) throw new NotFoundError('Order not found')

  assertTransition(order.status, to) // throws IllegalTransitionError

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: to } }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: to,
        actorId: actor.actorId,
        actorType: actor.actorType ?? (actor.actorId ? ActorType.USER : ActorType.SYSTEM),
        reason: actor.reason ?? null,
      },
    }),
  ])

  const refreshed = await getOrderDetail(orderId)
  if (!refreshed) throw new Error('Order disappeared after transition')
  return refreshed
}

export async function cancelOrder(
  orderId: string,
  actor: ActorContext,
): Promise<OrderDetailDto> {
  return transitionStatus(orderId, OrderStatus.CANCELLED, { ...actor, reason: actor.reason ?? 'Cancelled by request' })
}

/**
 * Add a free-form audit event without changing the status. Useful for "QR sent
 * via email", "Refund requested", etc.
 */
export async function addOrderEvent(
  orderId: string,
  actor: ActorContext & { reason: string },
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } })
  if (!order) throw new NotFoundError('Order not found')
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: order.status,
      toStatus: order.status, // no-op, keeps the same status
      actorId: actor.actorId,
      actorType: actor.actorType ?? (actor.actorId ? ActorType.USER : ActorType.SYSTEM),
      reason: actor.reason,
    },
  })
}

/**
 * Admin-only convenience for attaching a free-form internal note to an order
 * without moving the state machine. Tagged with `[INTERNAL]` so it's easy to
 * filter in the timeline UI.
 */
export async function addOrderInternalNote(
  orderId: string,
  note: string,
  actor: ActorContext,
): Promise<void> {
  const body = note?.trim()
  if (!body) throw new ValidationError('Note body is required')
  if (body.length > 2000) throw new ValidationError('Note too long')
  await addOrderEvent(orderId, {
    ...actor,
    actorType: actor.actorType ?? ActorType.ADMIN,
    reason: `[INTERNAL] ${body}`,
  })
}

/**
 * Re-trigger fulfilment for an order stuck in a failed/payment-success state.
 * Today this just nudges the timeline; Phase 4H will replace it with a real
 * provider retry. Allowed only from PAYMENT_SUCCESS, ORDER_SUBMITTED, QR_PENDING,
 * or FAILED.
 */
export async function retryOrder(orderId: string, actor: ActorContext): Promise<OrderDetailDto> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, deletedAt: true },
  })
  if (!order || order.deletedAt) throw new NotFoundError('Order not found')

  const retryable: OrderStatus[] = [
    OrderStatus.PAYMENT_SUCCESS,
    OrderStatus.ORDER_SUBMITTED,
    OrderStatus.QR_PENDING,
    OrderStatus.FAILED,
  ]
  if (!retryable.includes(order.status)) {
    throw new ValidationError(`Cannot retry an order in ${order.status}`)
  }

  // FAILED is terminal in the state machine. To allow a manual retry we add an
  // internal event explaining the manual override but do NOT push it into a
  // forbidden state — Phase 4H will introduce a RETRY_PENDING status.
  await addOrderEvent(orderId, {
    ...actor,
    actorType: actor.actorType ?? ActorType.ADMIN,
    reason: '[ADMIN] Manual retry requested — Phase 4H will dispatch to provider',
  })
  const refreshed = await getOrderDetail(orderId)
  if (!refreshed) throw new Error('Order disappeared after retry')
  return refreshed
}

export { IllegalTransitionError }
