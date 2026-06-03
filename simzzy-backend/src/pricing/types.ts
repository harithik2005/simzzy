import type { AppliedRuleType } from '@prisma/client'

/* ─── Public DTOs (no Decimal — Numbers for the wire) ────────────────────── */

export type GlobalRuleDto = {
  profitUsd: number
  isActive: boolean
  note: string | null
  updatedAt: string
  updatedByName: string | null
}

export type CountryRuleDto = {
  id: string
  country: { id: string; code: string; name: string; flag: string | null }
  profitUsd: number
  isActive: boolean
  updatedAt: string
}

export type DurationRuleDto = {
  id: string
  label: string
  minDays: number
  maxDays: number | null
  profitUsd: number
  isActive: boolean
  updatedAt: string
}

export type OverrideRuleDto = {
  id: string
  plan: {
    id: string
    slug: string
    esimId: string
    name: string
    costUsd: number
    flag: string | null
  }
  fixedPriceUsd: number
  reason: string | null
  isActive: boolean
  updatedAt: string
}

/** Full rule set returned by `GET /api/admin/pricing`. */
export type PricingRuleSetDto = {
  global: GlobalRuleDto
  countries: CountryRuleDto[]
  durations: DurationRuleDto[]
  overrides: OverrideRuleDto[]
}

/* ─── Resolver inputs / outputs ─────────────────────────────────────────── */

export type ResolveInput = {
  planId: string
  costUsd: number
  days: number
  primaryCountryId: string | null
}

export type AppliedRuleSummary = {
  type: AppliedRuleType
  label: string
  /** Database id of the rule (null for the global singleton). */
  ruleId: string | null
}

export type PriceBreakdown = {
  planId: string
  costUsd: number
  profitUsd: number
  sellingPriceUsd: number
  appliedRule: AppliedRuleSummary
}

/* ─── Stats (for Pricing Center header) ─────────────────────────────────── */

export type PricingStatsDto = {
  activeRules: number
  plansWithOverrides: number
  averageProfit: number
  highest: { label: string; profit: number }
}

export { AppliedRuleType }
