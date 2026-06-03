/** Currency detection + conversion helpers (no React). */

export const BASE_CURRENCY = 'USD'
const CACHE_KEY = 'simzzy_currency_v1'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export type CurrencyData = {
  code: string
  rate: number // USD → local multiplier
  fetchedAt: number
}

/** Currencies we surface in the manual switcher. Anything else still works via Intl. */
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'THB',
] as const

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$',
  SGD: 'S$', AED: 'AED', JPY: '¥', THB: '฿', KRW: '₩', CNY: '¥', BRL: 'R$',
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

/** Format a converted (already-local) amount using the platform locale + currency. */
export function formatLocal(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  } catch {
    // Unknown/unsupported ISO code → fall back to a plain symbol + 2dp.
    return `${currencySymbol(code)}${amount.toFixed(2)}`
  }
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/* ─── Cache ──────────────────────────────────────────────────────────────── */

export function readCache(): CurrencyData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as CurrencyData
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

export function writeCache(data: CurrencyData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/* ─── Remote lookups ───────────────────────────────────────────────────────── */

/**
 * Visitor currency + rate, resolved by our own backend.
 *
 * The server-side `/api/currency/me` route does the ipapi.co geo lookup, picks
 * a supported currency, and reads the (DB-cached, 1h TTL) USD→X rate. Keeps
 * third-party calls out of the browser, and lets us share the rate cache
 * cluster-wide instead of one fetch per visitor.
 */
export async function fetchVisitorCurrency(
  signal?: AbortSignal,
): Promise<{ code: string; rate: number }> {
  try {
    const res = await fetch('/api/currency/me', { signal, cache: 'no-store' })
    if (!res.ok) return { code: BASE_CURRENCY, rate: 1 }
    const json = (await res.json()) as { currencyCode?: string; rate?: number }
    return {
      code: typeof json.currencyCode === 'string' ? json.currencyCode : BASE_CURRENCY,
      rate: typeof json.rate === 'number' && Number.isFinite(json.rate) ? json.rate : 1,
    }
  } catch {
    return { code: BASE_CURRENCY, rate: 1 }
  }
}

/** Fetch only the USD→code rate (for manual currency switches). */
export async function fetchRate(code: string, signal?: AbortSignal): Promise<number> {
  if (code === BASE_CURRENCY) return 1
  try {
    const res = await fetch(`/api/currency/me?currency=${encodeURIComponent(code)}`, {
      signal,
      cache: 'no-store',
    })
    if (!res.ok) return 1
    const json = (await res.json()) as { rate?: number }
    return typeof json.rate === 'number' && Number.isFinite(json.rate) ? json.rate : 1
  } catch {
    return 1
  }
}
