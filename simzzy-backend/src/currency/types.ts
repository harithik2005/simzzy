export const BASE_CURRENCY = 'USD'

/**
 * Currencies we surface in the manual switcher and DB cache. The catalog UI
 * defaults to whichever code we detect from the visitor's IP, falling back to
 * USD when detection or rate fetch fails.
 */
export const SUPPORTED_CURRENCIES = [
  'USD', 'INR', 'EUR', 'GBP', 'AED', 'SGD', 'AUD',
  'JPY', 'THB', 'MYR', 'IDR', 'KRW', 'CAD', 'NZD', 'PHP',
] as const
export type SupportedCurrencyCode = typeof SUPPORTED_CURRENCIES[number]

export type RateDto = {
  base: string
  quote: string
  rate: number
  fetchedAt: string
  source: string | null
}

export type VisitorPricing = {
  currencyCode: string
  currencySymbol: string
  rate: number
  source: 'detected' | 'fallback' | 'override'
  countryCode?: string | null
  fetchedAt: string
}
