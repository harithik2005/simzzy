import { prisma } from '../../client'
import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  type RateDto,
  type SupportedCurrencyCode,
  type VisitorPricing,
} from './types'

/**
 * Currency service.
 *
 * - Exchange rates are fetched from https://open.er-api.com (free, no key) and
 *   stored in `exchange_rates`. The freshest row per (base, quote) wins, with a
 *   1-hour TTL: stale rates trigger a refresh on the next request.
 * - Visitor geo is detected from https://ipapi.co/{ip}/json/ — never from
 *   localhost, where we use USD as a sensible default.
 *
 * Both upstreams are external and may fail; in every failure path we surface
 * USD (rate 1) so the storefront never blocks.
 */

const RATES_TTL_MS = 60 * 60 * 1000 // 1 hour
const FETCH_TIMEOUT_MS = 5_000

const SYMBOLS: Record<string, string> = {
  USD: '$', INR: '₹', EUR: '€', GBP: '£', AED: 'AED', SGD: 'S$',
  AUD: 'A$', JPY: '¥', THB: '฿', MYR: 'RM', IDR: 'Rp', KRW: '₩',
  CAD: 'C$', NZD: 'NZ$', PHP: '₱',
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

/** Map ISO 3166-1 alpha-2 → preferred currency (only for supported codes). */
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrencyCode> = {
  US: 'USD', IN: 'INR', GB: 'GBP',
  // Eurozone (sample — extend if needed).
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR',
  GR: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', BE: 'EUR', LU: 'EUR',
  AE: 'AED', SG: 'SGD', AU: 'AUD', JP: 'JPY', TH: 'THB',
  MY: 'MYR', ID: 'IDR', KR: 'KRW', CA: 'CAD', NZ: 'NZD', PH: 'PHP',
}

function isSupported(code: string | null | undefined): code is SupportedCurrencyCode {
  if (!code) return false
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
  if (signal) signal.addEventListener('abort', () => ac.abort(), { once: true })
  try {
    return await fetch(url, { signal: ac.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

/* ─── Rate fetching + caching ───────────────────────────────────────────── */

/**
 * Pull every USD-based rate from open.er-api.com and upsert one row per supported
 * quote currency. Returns the number of rows written.
 */
export async function refreshRatesFromUpstream(): Promise<number> {
  let payload: { result?: string; rates?: Record<string, number> }
  try {
    const res = await fetchWithTimeout(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    payload = (await res.json()) as typeof payload
  } catch (e) {
    console.warn('[currency] upstream rate fetch failed:', (e as Error).message)
    return 0
  }
  if (!payload.rates) return 0

  const fetchedAt = new Date()
  let written = 0
  for (const quote of SUPPORTED_CURRENCIES) {
    if (quote === BASE_CURRENCY) continue
    const rate = payload.rates[quote]
    if (rate === undefined || !Number.isFinite(rate)) continue
    await prisma.exchangeRate.upsert({
      where: { baseCode_quoteCode_fetchedAt: { baseCode: BASE_CURRENCY, quoteCode: quote, fetchedAt } },
      update: { rate, source: 'open.er-api.com' },
      create: { baseCode: BASE_CURRENCY, quoteCode: quote, rate, fetchedAt, source: 'open.er-api.com' },
    })
    written++
  }
  return written
}

/** Return the freshest cached rate for `code` (or null if none cached). */
async function readCachedRate(code: string): Promise<{ rate: number; fetchedAt: Date } | null> {
  const row = await prisma.exchangeRate.findFirst({
    where: { baseCode: BASE_CURRENCY, quoteCode: code },
    orderBy: { fetchedAt: 'desc' },
  })
  if (!row) return null
  return { rate: Number(row.rate), fetchedAt: row.fetchedAt }
}

/**
 * Get the USD→code rate, refreshing the cache if it's older than 1 hour.
 * Falls back to 1 if the upstream can't be reached AND nothing is cached.
 */
export async function getRate(code: string): Promise<number> {
  if (code === BASE_CURRENCY) return 1

  const cached = await readCachedRate(code)
  const stale = !cached || Date.now() - cached.fetchedAt.getTime() > RATES_TTL_MS
  if (!stale && cached) return cached.rate

  // Stale or missing → try a refresh, then re-read.
  const wrote = await refreshRatesFromUpstream()
  if (wrote > 0) {
    const fresh = await readCachedRate(code)
    if (fresh) return fresh.rate
  }
  return cached?.rate ?? 1
}

/** All supported rates (refreshes the cache once when any quote is stale). */
export async function listRates(): Promise<RateDto[]> {
  const codes = SUPPORTED_CURRENCIES.filter((c) => c !== BASE_CURRENCY)
  // Trigger a single refresh if anything's stale — cheaper than per-rate checks.
  const sample = await readCachedRate(codes[0])
  if (!sample || Date.now() - sample.fetchedAt.getTime() > RATES_TTL_MS) {
    await refreshRatesFromUpstream()
  }

  const rows = await prisma.exchangeRate.findMany({
    where: { baseCode: BASE_CURRENCY, quoteCode: { in: codes as unknown as string[] } },
    orderBy: { fetchedAt: 'desc' },
  })

  // Take only the freshest row per quote.
  const seen = new Set<string>()
  const out: RateDto[] = []
  for (const r of rows) {
    if (seen.has(r.quoteCode)) continue
    seen.add(r.quoteCode)
    out.push({
      base: r.baseCode,
      quote: r.quoteCode,
      rate: Number(r.rate),
      fetchedAt: r.fetchedAt.toISOString(),
      source: r.source,
    })
  }
  // Include USD→USD = 1 for completeness.
  out.unshift({ base: BASE_CURRENCY, quote: BASE_CURRENCY, rate: 1, fetchedAt: new Date().toISOString(), source: null })
  return out
}

/* ─── Visitor detection ─────────────────────────────────────────────────── */

/**
 * Detect the visitor's currency from their IP via ipapi.co. Pass the IP
 * extracted from the request (proxy headers). Returns null on failure or for
 * localhost-style IPs.
 */
async function detectCurrencyFromIp(
  ip: string | null,
): Promise<{ code: SupportedCurrencyCode; countryCode: string } | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null
  }
  try {
    const res = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(ip)}/json/`)
    if (!res.ok) return null
    const json = (await res.json()) as { country_code?: string; currency?: string; error?: boolean }
    if (json.error) return null

    // Prefer ipapi's `currency` if it's supported; otherwise map from country.
    if (isSupported(json.currency)) {
      return { code: json.currency, countryCode: json.country_code ?? '' }
    }
    const cc = json.country_code?.toUpperCase() ?? ''
    const mapped = COUNTRY_TO_CURRENCY[cc]
    if (mapped) return { code: mapped, countryCode: cc }
    return null
  } catch {
    return null
  }
}

/**
 * One-shot helper for the public `/api/currency/me` endpoint.
 *
 * @param ip Visitor IP from request headers (x-forwarded-for, etc.)
 * @param override Manual currency code (e.g. from a query string / cookie).
 */
export async function getVisitorPricing(
  ip: string | null,
  override?: string | null,
): Promise<VisitorPricing> {
  // 1. Honour explicit override if it's supported.
  if (override && isSupported(override)) {
    const rate = await getRate(override)
    return {
      currencyCode: override,
      currencySymbol: currencySymbol(override),
      rate,
      source: 'override',
      fetchedAt: new Date().toISOString(),
    }
  }

  // 2. Try IP detection.
  const detected = await detectCurrencyFromIp(ip)
  if (detected) {
    const rate = await getRate(detected.code)
    return {
      currencyCode: detected.code,
      currencySymbol: currencySymbol(detected.code),
      rate,
      source: 'detected',
      countryCode: detected.countryCode,
      fetchedAt: new Date().toISOString(),
    }
  }

  // 3. Fallback — USD.
  return {
    currencyCode: BASE_CURRENCY,
    currencySymbol: currencySymbol(BASE_CURRENCY),
    rate: 1,
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
  }
}
