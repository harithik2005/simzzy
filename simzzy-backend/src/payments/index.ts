/**
 * Simzzy backend — payments module barrel.
 * For now only the dummy provider is wired. Real PSPs (EximPe, Stripe) land
 * in a later phase and will live next to `./dummy.ts`.
 */
export {
  startDummyPayment,
  confirmDummyPayment,
  PaymentNotFoundError,
  PaymentStateError,
} from './dummy'
export type { StartPaymentArgs, ConfirmPaymentArgs } from './dummy'
