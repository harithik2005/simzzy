import type { PricingRuleSet } from '@/lib/pricing'

/**
 * Seed pricing rules (mock). In production this comes from the pricing API
 * (`GET /api/admin/pricing/rules`) — the shape mirrors `PricingRuleSet` so the
 * page can swap the import for a fetch without other changes.
 */
export const initialPricingRules: PricingRuleSet = {
  global: { profit: 2 },
  countries: [
    { id: 'c-jp', country: 'Japan', profit: 3 },
    { id: 'c-us', country: 'USA', profit: 4 },
    { id: 'c-uk', country: 'UK', profit: 4 },
    { id: 'c-ae', country: 'UAE', profit: 5 },
  ],
  durations: [
    { id: 'd-1', label: '1–3 Days', minDays: 1, maxDays: 3, profit: 2 },
    { id: 'd-2', label: '4–7 Days', minDays: 4, maxDays: 7, profit: 3 },
    { id: 'd-3', label: '8–15 Days', minDays: 8, maxDays: 15, profit: 4 },
    { id: 'd-4', label: '30+ Days', minDays: 30, maxDays: null, profit: 5 },
  ],
  overrides: [
    { id: 'o-1', esimId: 'TS-JP-5GB-30D', planName: 'Japan 5GB', sellPrice: 12.99 },
  ],
}

/** Catalogue-level figures used by the pricing stats (mock; provider-sourced later). */
export const pricingCatalogue = {
  totalPlans: 9327,
  averageCost: 6.4,
}
