/**
 * Simzzy backend — payments module barrel.
 *
 * Two layers:
 *   • gateway abstraction (`./gateway`) + providers (`./providers/*`) — decide
 *     whether a payment is authorised. Selected at runtime by PAYMENT_PROVIDER.
 *   • persistence (`./dummy`) — provider-agnostic Payment row + order lifecycle.
 *
 * Cashfree lands as `./providers/cashfree.ts` implementing PaymentGateway, plus
 * a `case` in `getPaymentGateway()` — nothing else changes.
 */
import type { PaymentGateway } from './gateway'
import { getPaymentProviderName } from './gateway'
import { FakePaymentProvider } from './providers/fake'

export {
  startDummyPayment,
  confirmDummyPayment,
  PaymentNotFoundError,
  PaymentStateError,
} from './dummy'
export type { StartPaymentArgs, ConfirmPaymentArgs } from './dummy'

export { FakePaymentProvider, TEST_CARD } from './providers/fake'
export { getPaymentProviderName } from './gateway'
export type {
  PaymentGateway,
  PaymentProviderName,
  CardDetails,
  AuthorizeInput,
  AuthorizeResult,
} from './gateway'

/** Resolve the active payment gateway from `PAYMENT_PROVIDER` (default: fake). */
export function getPaymentGateway(): PaymentGateway {
  switch (getPaymentProviderName()) {
    case 'cashfree':
      // Implement ./providers/cashfree.ts and return new CashfreeProvider() here.
      throw new Error('Cashfree gateway is not implemented yet. Set PAYMENT_PROVIDER=fake.')
    case 'fake':
    default:
      return new FakePaymentProvider()
  }
}
