import { Prisma, PaymentStatus } from '@prisma/client'
import { prisma } from '../../client'
import { AdminError } from './_shared'

/**
 * Payment operations (read-only admin views).
 *
 * Today every payment flows through the Dummy gateway (see `src/payments`).
 * This module is provider-agnostic: it reads from the `payments` table and its
 * `payment_events` history, so when EximPe (or Stripe/PayPal) is wired in a
 * later phase the same views light up with zero changes here — only the
 * gateway adapter that *writes* payments differs. No gateway is contacted from
 * this module; mutations (refunds/captures) are deferred to that phase.
 *
 * Money note: `Payment.amount` is in the customer's local currency, so summing
 * it across mixed currencies is meaningless. Revenue stats therefore aggregate
 * the canonical USD value from the related order (`Order.usdTotal`).
 */

export type AdminPaymentDto = {
  id: string
  gatewayPaymentId: string | null
  orderId: string
  orderNumber: string
  customerName: string | null
  customerEmail: string
  amount: number
  currency: string
  usdAmount: number
  method: string | null
  provider: string
  status: PaymentStatus
  failureReason: string | null
  paidAt: string | null
  createdAt: string
}

export type AdminPaymentEventDto = {
  id: string
  eventType: string
  signatureVerified: boolean
  receivedAt: string
}

export type AdminPaymentDetailDto = AdminPaymentDto & {
  events: AdminPaymentEventDto[]
  refunds: Array<{ id: string; amount: number; currency: string; status: string; reason: string | null; createdAt: string }>
}

export type PaymentFilters = {
  q?: string
  status?: PaymentStatus | 'all'
}

export type PaymentStatsDto = {
  total: number
  byStatus: Record<string, number>
  capturedUsd: number
  refundedUsd: number
  successRate: number // percentage, 0–100
}

const LIST_SELECT = {
  id: true,
  gatewayPaymentId: true,
  orderId: true,
  amount: true,
  currency: true,
  method: true,
  status: true,
  failureReason: true,
  paidAt: true,
  createdAt: true,
  provider: { select: { name: true } },
  order: { select: { orderNumber: true, customerName: true, customerEmail: true, usdTotal: true } },
} satisfies Prisma.PaymentSelect

type ListRow = Prisma.PaymentGetPayload<{ select: typeof LIST_SELECT }>

function rowToDto(p: ListRow): AdminPaymentDto {
  return {
    id: p.id,
    gatewayPaymentId: p.gatewayPaymentId,
    orderId: p.orderId,
    orderNumber: p.order.orderNumber,
    customerName: p.order.customerName,
    customerEmail: p.order.customerEmail,
    amount: Number(p.amount),
    currency: p.currency,
    usdAmount: Number(p.order.usdTotal),
    method: p.method,
    provider: p.provider.name,
    status: p.status,
    failureReason: p.failureReason,
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }
}

export async function listPayments(filters: PaymentFilters = {}, limit = 200): Promise<AdminPaymentDto[]> {
  const where: Prisma.PaymentWhereInput = {}
  const ands: Prisma.PaymentWhereInput[] = []
  if (filters.status && filters.status !== 'all') ands.push({ status: filters.status })
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { gatewayPaymentId: { contains: q, mode: 'insensitive' } },
        { order: { is: { orderNumber: { contains: q, mode: 'insensitive' } } } },
        { order: { is: { customerEmail: { contains: q, mode: 'insensitive' } } } },
        { order: { is: { customerName: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }
  if (ands.length) where.AND = ands

  const rows = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Math.max(1, limit)),
    select: LIST_SELECT,
  })
  return rows.map(rowToDto)
}

export async function getPaymentDetail(id: string): Promise<AdminPaymentDetailDto> {
  const p = await prisma.payment.findUnique({
    where: { id },
    select: {
      ...LIST_SELECT,
      events: {
        orderBy: { receivedAt: 'desc' },
        select: { id: true, eventType: true, signatureVerified: true, receivedAt: true },
      },
      refunds: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, amount: true, currency: true, status: true, reason: true, createdAt: true },
      },
    },
  })
  if (!p) throw new AdminError('Payment not found', 404)
  return {
    ...rowToDto(p),
    events: p.events.map((e) => ({
      id: e.id, eventType: e.eventType, signatureVerified: e.signatureVerified,
      receivedAt: e.receivedAt.toISOString(),
    })),
    refunds: p.refunds.map((r) => ({
      id: r.id, amount: Number(r.amount), currency: r.currency, status: r.status,
      reason: r.reason, createdAt: r.createdAt.toISOString(),
    })),
  }
}

export async function getPaymentStats(): Promise<PaymentStatsDto> {
  const [grouped, capturedAgg, refundedAgg] = await Promise.all([
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({ _sum: { usdTotal: true }, where: { payments: { some: { status: PaymentStatus.SUCCESS } } } }),
    prisma.order.aggregate({ _sum: { usdTotal: true }, where: { payments: { some: { status: PaymentStatus.REFUNDED } } } }),
  ])

  const byStatus: Record<string, number> = {}
  let total = 0
  for (const g of grouped) {
    byStatus[g.status] = g._count._all
    total += g._count._all
  }
  const success = byStatus[PaymentStatus.SUCCESS] ?? 0
  const failed = byStatus[PaymentStatus.FAILED] ?? 0
  const successRate = success + failed > 0 ? Math.round((success / (success + failed)) * 1000) / 10 : 0

  return {
    total,
    byStatus,
    capturedUsd: Math.round(Number(capturedAgg._sum.usdTotal ?? 0) * 100) / 100,
    refundedUsd: Math.round(Number(refundedAgg._sum.usdTotal ?? 0) * 100) / 100,
    successRate,
  }
}
