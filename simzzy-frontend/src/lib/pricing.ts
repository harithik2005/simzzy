/**
 * Pricing engine — fixed-dollar profit model (NOT percentage markup).
 *
 * Selling price = cost + a single fixed-dollar profit chosen by the most
 * specific matching rule, unless a plan-level override sets an absolute price.
 *
 * Resolution priority (highest wins):
 *   1. Plan override  (absolute sell price for a specific eSIM ID)
 *   2. Country rule   (+$ profit for plans in a country)
 *   3. Duration rule  (+$ profit for a validity range)
 *   4. Global rule    (+$ profit applied to everything else)
 *
 * Pure + dependency-free so it can run unchanged on the server once a real
 * pricing API backs the rule set.
 */

export type GlobalProfitRule = {
  profit: number
}

export type CountryProfitRule = {
  id: string
  country: string
  profit: number
}

export type DurationProfitRule = {
  id: string
  label: string
  minDays: number
  /** null = open-ended (e.g. "30+ days"). */
  maxDays: number | null
  profit: number
}

export type PlanOverrideRule = {
  id: string
  esimId: string
  planName: string
  sellPrice: number
}

export type PricingRuleSet = {
  global: GlobalProfitRule
  countries: CountryProfitRule[]
  durations: DurationProfitRule[]
  overrides: PlanOverrideRule[]
}

export type AppliedRuleType = 'override' | 'country' | 'duration' | 'global'

export type PriceInput = {
  costPrice: number
  country?: string
  days?: number
  esimId?: string
}

export type PriceResult = {
  baseCost: number
  appliedRuleType: AppliedRuleType
  appliedRuleLabel: string
  sellingPrice: number
  profit: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function findDurationRule(
  days: number,
  durations: DurationProfitRule[],
): DurationProfitRule | undefined {
  return durations.find(
    (d) => days >= d.minDays && (d.maxDays === null || days <= d.maxDays),
  )
}

export function findCountryRule(
  country: string,
  countries: CountryProfitRule[],
): CountryProfitRule | undefined {
  const target = country.trim().toLowerCase()
  return countries.find((c) => c.country.toLowerCase() === target)
}

/** Resolve the final selling price + the single rule that produced it. */
export function computePrice(input: PriceInput, rules: PricingRuleSet): PriceResult {
  const baseCost = round2(input.costPrice || 0)

  // 1. Plan override — absolute price, ignores every profit rule.
  if (input.esimId) {
    const override = rules.overrides.find((o) => o.esimId === input.esimId)
    if (override) {
      return {
        baseCost,
        appliedRuleType: 'override',
        appliedRuleLabel: `Override · ${override.planName}`,
        sellingPrice: round2(override.sellPrice),
        profit: round2(override.sellPrice - baseCost),
      }
    }
  }

  // 2. Country rule.
  if (input.country) {
    const rule = findCountryRule(input.country, rules.countries)
    if (rule) {
      return {
        baseCost,
        appliedRuleType: 'country',
        appliedRuleLabel: `${rule.country} +$${rule.profit}`,
        sellingPrice: round2(baseCost + rule.profit),
        profit: round2(rule.profit),
      }
    }
  }

  // 3. Duration rule.
  if (typeof input.days === 'number') {
    const rule = findDurationRule(input.days, rules.durations)
    if (rule) {
      return {
        baseCost,
        appliedRuleType: 'duration',
        appliedRuleLabel: `${rule.label} +$${rule.profit}`,
        sellingPrice: round2(baseCost + rule.profit),
        profit: round2(rule.profit),
      }
    }
  }

  // 4. Global fallback.
  return {
    baseCost,
    appliedRuleType: 'global',
    appliedRuleLabel: `Global +$${rules.global.profit}`,
    sellingPrice: round2(baseCost + rules.global.profit),
    profit: round2(rules.global.profit),
  }
}

export type PricingStats = {
  activeRules: number
  plansWithOverrides: number
  averageProfit: number
  highest: { label: string; profit: number }
}

/** Derive headline stats from the current rule set (kept out of the UI). */
export function pricingStats(rules: PricingRuleSet): PricingStats {
  const profitRules: { label: string; profit: number }[] = [
    { label: 'Global', profit: rules.global.profit },
    ...rules.countries.map((c) => ({ label: c.country, profit: c.profit })),
    ...rules.durations.map((d) => ({ label: d.label, profit: d.profit })),
  ]

  const totalProfit = profitRules.reduce((sum, r) => sum + r.profit, 0)
  const highest = profitRules.reduce(
    (max, r) => (r.profit > max.profit ? r : max),
    profitRules[0],
  )

  return {
    activeRules: rules.countries.length + rules.durations.length + rules.overrides.length,
    plansWithOverrides: rules.overrides.length,
    averageProfit: round2(totalProfit / profitRules.length),
    highest,
  }
}
