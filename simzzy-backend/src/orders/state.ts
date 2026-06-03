import { OrderStatus } from '@prisma/client'

/**
 * Order state machine for Simzzy.
 *
 * The schema's `OrderStatus` enum is more granular than the public-facing spec.
 * Internally we use every status; in storefront UI we collapse the eight
 * fulfilment statuses into the spec's seven buckets:
 *
 *   PENDING            → PENDING           (just created, no payment yet)
 *   PAYMENT_PROCESSING → PAYMENT_PENDING   (charged but not yet captured)
 *   PAYMENT_SUCCESS    → PAYMENT_SUCCESS   (captured, waiting to fulfil)
 *   ORDER_SUBMITTED    ┐
 *   QR_PENDING         │  → PROCESSING     (handed off to provider)
 *   QR_RECEIVED        ┘
 *   DELIVERED          ┐  → COMPLETED      (customer can install)
 *   ACTIVATED          ┘
 *   FAILED             → FAILED
 *   CANCELLED          → CANCELLED
 *   REFUNDED           → REFUNDED
 *
 * `ALLOWED_TRANSITIONS` is the only allow-list — anything not listed throws
 * `IllegalTransitionError`. Terminal states (CANCELLED, REFUNDED, FAILED) have
 * no outbound moves.
 */

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED, OrderStatus.FAILED],
  PAYMENT_PROCESSING: [OrderStatus.PAYMENT_SUCCESS, OrderStatus.FAILED, OrderStatus.CANCELLED],
  PAYMENT_SUCCESS: [OrderStatus.ORDER_SUBMITTED, OrderStatus.FAILED, OrderStatus.REFUNDED],
  ORDER_SUBMITTED: [OrderStatus.QR_PENDING, OrderStatus.QR_RECEIVED, OrderStatus.FAILED, OrderStatus.REFUNDED],
  QR_PENDING: [OrderStatus.QR_RECEIVED, OrderStatus.FAILED, OrderStatus.REFUNDED],
  QR_RECEIVED: [OrderStatus.DELIVERED, OrderStatus.FAILED, OrderStatus.REFUNDED],
  DELIVERED: [OrderStatus.ACTIVATED, OrderStatus.REFUNDED],
  ACTIVATED: [OrderStatus.REFUNDED],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
}

export class IllegalTransitionError extends Error {
  readonly code = 'ILLEGAL_TRANSITION' as const
  constructor(public from: OrderStatus, public to: OrderStatus) {
    super(`Cannot transition order from ${from} → ${to}`)
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) return // no-op moves are silently allowed
  const allowed = ALLOWED_TRANSITIONS[from]
  if (!allowed.includes(to)) throw new IllegalTransitionError(from, to)
}

/** Coarse public-facing bucket for the storefront UI. */
export type PublicStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'

export const PUBLIC_STATUS: Record<OrderStatus, PublicStatus> = {
  PENDING: 'PENDING',
  PAYMENT_PROCESSING: 'PAYMENT_PENDING',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  ORDER_SUBMITTED: 'PROCESSING',
  QR_PENDING: 'PROCESSING',
  QR_RECEIVED: 'PROCESSING',
  DELIVERED: 'COMPLETED',
  ACTIVATED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}
