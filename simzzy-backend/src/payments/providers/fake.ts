import type { AuthorizeInput, AuthorizeResult, PaymentGateway } from '../gateway'

/**
 * FakePaymentProvider — a sandbox gateway for end-to-end checkout/order testing
 * before a real PSP is wired in. No network calls; the decision is purely a
 * comparison against a single accepted test card.
 *
 *   Success  → the entered card EXACTLY matches `TEST_CARD`.
 *   Failure  → any mismatch, with a field-specific, customer-facing reason.
 *
 * Persisted under the seeded `dummy` PaymentProvider row (see `slug`).
 */

/** The only card that succeeds in test mode. Shown to the user in the UI panel. */
export const TEST_CARD = {
  number: '1234 4321 1234 4321',
  name: 'SIMZZY',
  expiry: '12/30',
  cvv: '009',
} as const

const onlyDigits = (s: string) => s.replace(/\D/g, '')

function normaliseExpiry(s: string): string {
  const d = onlyDigits(s).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

/** Provider transaction reference — stored as `Payment.gatewayPaymentId`. */
function newTransactionRef(): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `FAKEPAY-${Date.now().toString(36).toUpperCase()}-${rand}`
}

function decline(ref: string, code: string, failureReason: string): AuthorizeResult {
  return { ok: false, transactionRef: ref, code, failureReason }
}

export class FakePaymentProvider implements PaymentGateway {
  // Payments persist under the existing seeded 'dummy' provider record, so no
  // schema/seed change is needed to run the sandbox.
  readonly slug = 'dummy'
  readonly testMode = true

  async authorize(input: AuthorizeInput): Promise<AuthorizeResult> {
    const ref = newTransactionRef()

    if (input.method !== 'card' || !input.card) {
      return decline(ref, 'METHOD_UNSUPPORTED', 'Only card payments are supported in test mode.')
    }

    const number = onlyDigits(input.card.number)
    const name = input.card.name.trim().toUpperCase()
    const expiry = normaliseExpiry(input.card.expiry)
    const cvv = input.card.cvv.trim()

    // 1) Shape validation — generic "this isn't a card" messages.
    if (number.length !== 16) return decline(ref, 'CARD_NUMBER_INVALID', 'Enter a valid 16-digit card number.')
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return decline(ref, 'EXPIRY_INVALID', 'Enter the expiry date as MM/YY.')
    if (cvv.length < 3) return decline(ref, 'CVV_INVALID', 'Enter a valid 3-digit CVV.')

    // 2) Match the accepted test card — specific decline per mismatched field.
    if (number !== onlyDigits(TEST_CARD.number)) return decline(ref, 'CARD_DECLINED', 'Card declined — incorrect card number.')
    if (name !== TEST_CARD.name) return decline(ref, 'NAME_MISMATCH', 'Cardholder name does not match the card.')
    if (expiry !== TEST_CARD.expiry) return decline(ref, 'EXPIRY_MISMATCH', 'Card declined — incorrect expiry date.')
    if (cvv !== TEST_CARD.cvv) return decline(ref, 'CVV_MISMATCH', 'Card declined — incorrect CVV.')

    return { ok: true, transactionRef: ref }
  }
}
