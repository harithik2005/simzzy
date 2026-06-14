/**
 * Payment gateway abstraction.
 *
 * Everything that wants to *take a payment* depends on this interface, never on
 * a concrete provider. A provider's only job here is `authorize()` — validate
 * the instrument and decide success/failure, returning a transaction reference
 * and (on decline) a customer-facing reason. Persistence of the Payment row and
 * the order state machine lives in `./dummy.ts` and is provider-agnostic.
 *
 * Swapping in a real PSP (Cashfree) later means adding one file under
 * `./providers/` that implements this interface and one `case` in the factory —
 * no changes to the route, the DB layer, or the order lifecycle.
 */

/** Raw card instrument as entered at checkout (test mode only). */
export type CardDetails = {
  /** Digits, may include spaces — normalised by the provider. */
  number: string
  name: string
  /** "MM/YY". */
  expiry: string
  cvv: string
}

export type AuthorizeInput = {
  amount: number
  currency: string
  /** 'card' is the only method accepted in test mode. */
  method: string
  card?: CardDetails
}

export type AuthorizeResult = {
  ok: boolean
  /** Provider-side reference — persisted as `Payment.gatewayPaymentId`. */
  transactionRef: string
  /** Customer-facing decline reason when `ok` is false. */
  failureReason?: string
  /** Stable machine code for the decline (e.g. `CARD_DECLINED`). */
  code?: string
}

export interface PaymentGateway {
  /** Matches the `PaymentProvider.slug` the payment is persisted under. */
  readonly slug: string
  /** When true the UI shows a TEST MODE badge + test-card panel. */
  readonly testMode: boolean
  authorize(input: AuthorizeInput): Promise<AuthorizeResult>
}

/** Which provider this deployment uses. Driven by `PAYMENT_PROVIDER`. */
export type PaymentProviderName = 'fake' | 'cashfree'

export function getPaymentProviderName(): PaymentProviderName {
  return (process.env.PAYMENT_PROVIDER ?? 'fake').toLowerCase() === 'cashfree'
    ? 'cashfree'
    : 'fake'
}
