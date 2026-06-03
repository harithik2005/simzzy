/**
 * tSIM (TSim Tech) request signing.
 *
 * Per the TSim Open API spec §2, every request carries four public headers:
 *   TSIM-ACCOUNT    account id
 *   TSIM-NONCE      random string 6–32 chars, unique within an hour
 *   TSIM-TIMESTAMP  unix time in SECONDS (10 digits)
 *   TSIM-SIGN       HMAC-SHA256( TSIM-ACCOUNT + TSIM-NONCE + TSIM-TIMESTAMP , secret )
 *
 * The signed string is the literal concatenation of account+nonce+timestamp
 * (no separators); the HMAC key is the shared secret. We emit lowercase hex.
 * No secret is ever logged here.
 */
import { createHmac, randomBytes } from 'node:crypto'

export function hmacSha256Hex(message: string, secret: string): string {
  return createHmac('sha256', secret).update(message, 'utf8').digest('hex')
}

/** Random alphanumeric nonce (default 24 chars, within the 6–32 spec range). */
export function makeNonce(length = 24): string {
  const n = Math.min(32, Math.max(6, length))
  // hex from random bytes, trimmed to length — always within [6,32] and unique.
  return randomBytes(32).toString('hex').slice(0, n)
}

export interface TsimAuthHeaders {
  'TSIM-ACCOUNT': string
  'TSIM-NONCE': string
  'TSIM-TIMESTAMP': string
  'TSIM-SIGN': string
}

/** Build the four TSIM-* auth headers for a single request. */
export function buildTsimHeaders(params: {
  account: string
  secret: string
  nonce?: string
  timestampSec?: number
}): TsimAuthHeaders {
  const nonce = params.nonce ?? makeNonce()
  const timestamp = String(params.timestampSec ?? Math.floor(Date.now() / 1000))
  const sign = hmacSha256Hex(params.account + nonce + timestamp, params.secret)
  return {
    'TSIM-ACCOUNT': params.account,
    'TSIM-NONCE': nonce,
    'TSIM-TIMESTAMP': timestamp,
    'TSIM-SIGN': sign,
  }
}
