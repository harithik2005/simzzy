import type { OrderStatus, PaymentStatus } from '@prisma/client'
import type { PublicStatus } from './state'

export type OrderItemDto = {
  id: string
  planId: string | null
  planName: string
  planEsimId: string
  country: string | null
  region: string | null
  data: string
  days: number
  apn: string | null
  network: string | null
  costUsd: number
  profitUsd: number
  sellingPriceUsd: number
  appliedRuleType: string
  appliedRuleLabel: string | null
  quantity: number
}

export type OrderEventDto = {
  id: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  actorId: string | null
  actorType: string
  reason: string | null
  createdAt: string
}

export type OrderPaymentDto = {
  id: string
  status: PaymentStatus
  amount: number
  currency: string
  method: string | null
  paidAt: string | null
  createdAt: string
  providerSlug: string
}

export type OrderSummaryDto = {
  id: string
  orderNumber: string
  status: OrderStatus
  publicStatus: PublicStatus
  currency: string
  usdSubtotal: number
  usdDiscount: number
  usdTotal: number
  localTotal: number
  fxRate: number
  createdAt: string
  updatedAt: string
  itemSummary: string
  itemCount: number
  customerEmail: string
  customerName: string | null
}

export type OrderDetailDto = OrderSummaryDto & {
  customerPhone: string | null
  items: OrderItemDto[]
  timeline: OrderEventDto[]
  payments: OrderPaymentDto[]
  user: { id: string; name: string | null; email: string } | null
}

export type CreateOrderInput = {
  planSlug: string
  customerEmail: string
  customerName?: string | null
  customerPhone?: string | null
  /** Visitor's local currency at checkout; rate is locked at order creation. */
  currency: string
  /** Optional promotion code — validated client-side today; server still snapshots discount. */
  discountUsd?: number
  /** Optional override quantity (default 1). */
  quantity?: number
}

export type OrderListFilters = {
  status?: OrderStatus
  /** ISO date strings (yyyy-mm-dd or full ISO) — inclusive `from`, exclusive `to + 1d`. */
  dateFrom?: string
  dateTo?: string
  /** Free-text — matches orderNumber, customerEmail, customerName, user.email. */
  q?: string
  /** Country name from OrderItem snapshot. */
  country?: string
}
