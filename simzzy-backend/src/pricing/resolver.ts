import type { Prisma } from '@prisma/client'
import { AppliedRuleType } from '@prisma/client'
import { prisma } from '../../client'
import type {
  AppliedRuleSummary,
  PriceBreakdown,
  ResolveInput,
} from './types'

/**
 * Pure resolver for one plan's selling price. Loads the active rules once
 * (via `loadActiveRules()`), then a separate `resolveOne()` picks the highest-
 * priority match. Keeping rule-loading separate lets the bulk refresher reuse
 * the same in-memory snapshot for thousands of plans.
 *
 * Priority (highest wins):
 *   1. Plan override   → fixed absolute price
 *   2. Country rule    → +profit on cost (uses plan.primaryCountryId)
 *   3. Duration rule   → +profit on cost (first rule whose range contains `days`)
 *   4. Global rule     → +profit on cost (default; singleton row)
 *
 * Money math uses Number — values are USD with ≤ 2 decimal places, well within
 * JS float precision (Prisma Decimal is reserved for storage).
 */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export type ActiveRulesSnapshot = {
  global: { profitUsd: number; isActive: boolean }
  /** Keyed by countryId for O(1) lookup. */
  byCountry: Map<string, { id: string; name: string; profitUsd: number }>
  /** Ordered by minDays asc so the first matching range wins deterministically. */
  durations: Array<{ id: string; label: string; minDays: number; maxDays: number | null; profitUsd: number }>
  /** Keyed by planId. */
  overrides: Map<string, { id: string; fixedPriceUsd: number }>
}

const DEFAULT_GLOBAL = { profitUsd: 0, isActive: false }

/**
 * Load every active rule in four queries; share the snapshot across many resolves.
 *
 * Issued sequentially (not Promise.all) because the Supabase pooler we use
 * occasionally drops connections under bursty parallel queries from a single
 * client. The extra latency (~3 round-trips instead of 1) is negligible — this
 * runs once per cache refresh, not per request.
 */
export async function loadActiveRules(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<ActiveRulesSnapshot> {
  const globalRow = await tx.pricingGlobalRule.findUnique({ where: { id: 1 } })
  const countryRows = await tx.pricingCountryRule.findMany({
    where: { isActive: true },
    select: {
      countryId: true,
      profitUsd: true,
      country: { select: { id: true, name: true } },
    },
  })
  const durationRows = await tx.pricingDurationRule.findMany({
    where: { isActive: true },
    orderBy: [{ minDays: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, label: true, minDays: true, maxDays: true, profitUsd: true },
  })
  const overrideRows = await tx.planPriceOverride.findMany({
    where: { isActive: true },
    select: { id: true, planId: true, fixedPriceUsd: true },
  })

  const global = globalRow
    ? { profitUsd: Number(globalRow.profitUsd), isActive: globalRow.isActive }
    : DEFAULT_GLOBAL

  const byCountry = new Map<string, { id: string; name: string; profitUsd: number }>()
  for (const r of countryRows) {
    byCountry.set(r.countryId, {
      id: r.country.id,
      name: r.country.name,
      profitUsd: Number(r.profitUsd),
    })
  }

  const durations = durationRows.map((d) => ({
    id: d.id,
    label: d.label,
    minDays: d.minDays,
    maxDays: d.maxDays,
    profitUsd: Number(d.profitUsd),
  }))

  const overrides = new Map<string, { id: string; fixedPriceUsd: number }>()
  for (const o of overrideRows) {
    overrides.set(o.planId, { id: o.id, fixedPriceUsd: Number(o.fixedPriceUsd) })
  }

  return { global, byCountry, durations, overrides }
}

/* ─── Resolver ──────────────────────────────────────────────────────────── */

export function resolveOne(input: ResolveInput, rules: ActiveRulesSnapshot): PriceBreakdown {
  const cost = round2(input.costUsd)

  // 1. Plan override — absolute selling price.
  const override = rules.overrides.get(input.planId)
  if (override) {
    const sell = round2(override.fixedPriceUsd)
    return {
      planId: input.planId,
      costUsd: cost,
      profitUsd: round2(sell - cost),
      sellingPriceUsd: sell,
      appliedRule: {
        type: AppliedRuleType.OVERRIDE,
        label: `Override · $${sell.toFixed(2)}`,
        ruleId: override.id,
      },
    }
  }

  // 2. Country rule.
  if (input.primaryCountryId) {
    const country = rules.byCountry.get(input.primaryCountryId)
    if (country) {
      const sell = round2(cost + country.profitUsd)
      return {
        planId: input.planId,
        costUsd: cost,
        profitUsd: round2(country.profitUsd),
        sellingPriceUsd: sell,
        appliedRule: {
          type: AppliedRuleType.COUNTRY,
          label: `${country.name} +$${country.profitUsd.toFixed(2)}`,
          ruleId: country.id,
        },
      }
    }
  }

  // 3. Duration rule.
  const duration = rules.durations.find(
    (d) => input.days >= d.minDays && (d.maxDays === null || input.days <= d.maxDays),
  )
  if (duration) {
    const sell = round2(cost + duration.profitUsd)
    return {
      planId: input.planId,
      costUsd: cost,
      profitUsd: round2(duration.profitUsd),
      sellingPriceUsd: sell,
      appliedRule: {
        type: AppliedRuleType.DURATION,
        label: `${duration.label} +$${duration.profitUsd.toFixed(2)}`,
        ruleId: duration.id,
      },
    }
  }

  // 4. Global fallback.
  const profit = rules.global.isActive ? rules.global.profitUsd : 0
  const sell = round2(cost + profit)
  return {
    planId: input.planId,
    costUsd: cost,
    profitUsd: round2(profit),
    sellingPriceUsd: sell,
    appliedRule: {
      type: AppliedRuleType.GLOBAL,
      label: `Global +$${profit.toFixed(2)}`,
      ruleId: null,
    },
  }
}

/** Convenience — strip the breakdown down to just the matched rule. */
export function appliedRuleOnly(breakdown: PriceBreakdown): AppliedRuleSummary {
  return breakdown.appliedRule
}
