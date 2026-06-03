/**
 * Simzzy backend — orders module barrel.
 * Order lifecycle: create, read, transition, audit. Pricing snapshot is taken
 * at creation and never recomputed; FX rate is locked at creation.
 */
export {
  createOrder,
  getOrderDetail,
  getMyOrder,
  listOrders,
  transitionStatus,
  cancelOrder,
  addOrderEvent,
  addOrderInternalNote,
  retryOrder,
  ValidationError,
  NotFoundError,
  IllegalTransitionError,
} from './service'

export {
  ALLOWED_TRANSITIONS,
  PUBLIC_STATUS,
  assertTransition,
  isTerminal,
} from './state'
export type { PublicStatus } from './state'

export type {
  CreateOrderInput,
  OrderListFilters,
  OrderSummaryDto,
  OrderDetailDto,
  OrderItemDto,
  OrderEventDto,
  OrderPaymentDto,
} from './types'

export type { ActorContext } from './service'
