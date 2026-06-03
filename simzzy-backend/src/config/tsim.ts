/**
 * Simzzy backend — tSIM (TSim Tech Co., Ltd) provider configuration.
 *
 * API: TSim Open API v1.0 (https://api.tsimtech.com, paths under /tsim/v1 & /v2).
 * Auth is a per-request HMAC-SHA256 header signature — there is NO login/token
 * endpoint. Public request headers on EVERY call:
 *   TSIM-ACCOUNT    account id (TSIM_ACCOUNT)
 *   TSIM-NONCE      random 6–32 chars, unique within an hour
 *   TSIM-TIMESTAMP  unix seconds (10 digits), server TZ UTC+8
 *   TSIM-SIGN       HMAC-SHA256(TSIM-ACCOUNT + TSIM-NONCE + TSIM-TIMESTAMP, secret)
 *
 * Credentials are ENV-ONLY — never hardcode. Nothing here logs a secret value.
 *   TSIM_API_HOST   base URL, e.g. https://api.tsimtech.com
 *   TSIM_ACCOUNT    account allocated by TSim
 *   TSIM_SECRET     HMAC secret allocated by TSim
 */

export interface TsimConfig {
  /** Base URL, no trailing slash. */
  host: string
  /** TSIM-ACCOUNT. */
  account: string
  /** HMAC secret (TSIM-SIGN key). */
  secret: string
}

function trimSlash(v: string): string {
  return v.replace(/\/+$/, '')
}

/** Read config from env. Throws a clear error if a required var is missing. */
export function loadTsimConfig(env: NodeJS.ProcessEnv = process.env): TsimConfig {
  const host = env.TSIM_API_HOST?.trim()
  const account = env.TSIM_ACCOUNT?.trim()
  const secret = env.TSIM_SECRET?.trim()

  const missing: string[] = []
  if (!host) missing.push('TSIM_API_HOST')
  if (!account) missing.push('TSIM_ACCOUNT')
  if (!secret) missing.push('TSIM_SECRET')
  if (missing.length) {
    throw new Error(`tSIM config missing required env var(s): ${missing.join(', ')}`)
  }

  return { host: trimSlash(host!), account: account!, secret: secret! }
}

/** Mask a secret for logs: keep first 2 + last 2 chars, star the middle. */
export function maskSecret(value: string | undefined): string {
  if (!value) return '(unset)'
  if (value.length <= 4) return '****'
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-2)}`
}

/**
 * Non-throwing status snapshot — safe to log. Reports which credentials are
 * present (booleans) and masked identifiers only; never exposes a secret.
 */
export function tsimConfigStatus(env: NodeJS.ProcessEnv = process.env): {
  hostConfigured: boolean
  accountConfigured: boolean
  secretConfigured: boolean
  host: string | null
  accountMasked: string
  secretMasked: string
} {
  return {
    hostConfigured: Boolean(env.TSIM_API_HOST?.trim()),
    accountConfigured: Boolean(env.TSIM_ACCOUNT?.trim()),
    secretConfigured: Boolean(env.TSIM_SECRET?.trim()),
    host: env.TSIM_API_HOST?.trim() || null,
    accountMasked: maskSecret(env.TSIM_ACCOUNT?.trim()),
    secretMasked: maskSecret(env.TSIM_SECRET?.trim()),
  }
}
