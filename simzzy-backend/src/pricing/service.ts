import type { Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { loadActiveRules, resolveOne, type ActiveRulesSnapshot } from './resolver'
import type {
  AppliedRuleSummary,
  CountryRuleDto,
  DurationRuleDto,
  GlobalRuleDto,
  OverrideRuleDto,
  PriceBreakdown,
  PricingRuleSetDto,
  PricingStatsDto,
  ResolveInput,
} from './types'

/* ─── Single-plan helpers ───────────────────────────────────────────────── */

/**
 * Compute the selling price for one plan, loading rules on demand. For bulk
 * pricing (e.g. browse), call `loadActiveRules()` once and reuse the snapshot
 * via the lower-level `resolveOne()` from `./resolver`.
 */
export async function getPriceBreakdown(planId: string): Promise<PriceBreakdown | null> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, costUsd: true, days: true, primaryCountryId: true },
  })
  if (!plan) return null

  const rules = await loadActiveRules()
  return resolveOne(
    {
      planId: plan.id,
      costUsd: Number(plan.costUsd),
      days: plan.days,
      primaryCountryId: plan.primaryCountryId,
    },
    rules,
  )
}

/** Selling price only. */
export async function getResolvedPrice(planId: string): Promise<number | null> {
  const b = await getPriceBreakdown(planId)
  return b ? b.sellingPriceUsd : null
}

/** Profit only. */
export async function getResolvedProfit(planId: string): Promise<number | null> {
  const b = await getPriceBreakdown(planId)
  return b ? b.profitUsd : null
}

/** Applied rule only. */
export async function getAppliedRule(planId: string): Promise<AppliedRuleSummary | null> {
  const b = await getPriceBreakdown(planId)
  return b ? b.appliedRule : null
}

/** Stateless price math — given cost + plan inputs, returns the selling price. */
export function calculateSellingPrice(
  input: ResolveInput,
  rules: ActiveRulesSnapshot,
): number {
  return resolveOne(input, rules).sellingPriceUsd
}

/* ─── Cache refresh ─────────────────────────────────────────────────────── */

/**
 * Recompute `plans.cachedSellingPriceUsd` for the given planIds.
 * Uses one rule snapshot for the whole batch, then issues per-plan updates
 * (cheap because we only touch one column).
 */
export async function refreshPlanCache(planIds: string[]): Promise<number> {
  if (planIds.length === 0) return 0
  const plans = await prisma.plan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, costUsd: true, days: true, primaryCountryId: true },
  })
  if (plans.length === 0) return 0
  const rules = await loadActiveRules()

  await prisma.$transaction(
    plans.map((p) => {
      const price = resolveOne(
        {
          planId: p.id,
          costUsd: Number(p.costUsd),
          days: p.days,
          primaryCountryId: p.primaryCountryId,
        },
        rules,
      ).sellingPriceUsd
      return prisma.plan.update({
        where: { id: p.id },
        data: { cachedSellingPriceUsd: price },
      })
    }),
  )
  return plans.length
}

/** Refresh every active plan — call after global / duration / global-rule changes. */
export async function refreshAllCaches(): Promise<number> {
  const ids = await prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true },
  })
  return refreshPlanCache(ids.map((p) => p.id))
}

/** Refresh every active plan whose primaryCountryId matches. */
export async function refreshCachesForCountry(countryId: string): Promise<number> {
  const plans = await prisma.plan.findMany({
    where: { primaryCountryId: countryId, isActive: true, deletedAt: null },
    select: { id: true },
  })
  return refreshPlanCache(plans.map((p) => p.id))
}

/** Refresh every active plan whose days fall in the duration rule's range. */
export async function refreshCachesForDuration(
  minDays: number,
  maxDays: number | null,
): Promise<number> {
  const days: Prisma.IntFilter = { gte: minDays }
  if (maxDays !== null) days.lte = maxDays
  const plans = await prisma.plan.findMany({
    where: { days, isActive: true, deletedAt: null },
    select: { id: true },
  })
  return refreshPlanCache(plans.map((p) => p.id))
}

/* ─── Rule listing ──────────────────────────────────────────────────────── */

export async function getRuleSet(): Promise<PricingRuleSetDto> {
  const [globalRow, countryRows, durationRows, overrideRows] = await Promise.all([
    prisma.pricingGlobalRule.findUnique({
      where: { id: 1 },
      include: { updatedBy: { select: { name: true } } },
    }),
    prisma.pricingCountryRule.findMany({
      orderBy: { country: { name: 'asc' } },
      include: { country: { select: { id: true, code: true, name: true, flag: true } } },
    }),
    prisma.pricingDurationRule.findMany({
      orderBy: [{ minDays: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.planPriceOverride.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            id: true, slug: true, esimId: true, name: true, costUsd: true,
            primaryCountry: { select: { flag: true } },
          },
        },
      },
    }),
  ])

  const global: GlobalRuleDto = globalRow
    ? {
        profitUsd: Number(globalRow.profitUsd),
        isActive: globalRow.isActive,
        note: globalRow.note,
        updatedAt: globalRow.updatedAt.toISOString(),
        updatedByName: globalRow.updatedBy?.name ?? null,
      }
    : {
        profitUsd: 0, isActive: false, note: null,
        updatedAt: new Date(0).toISOString(), updatedByName: null,
      }

  const countries: CountryRuleDto[] = countryRows.map((r) => ({
    id: r.id,
    country: { id: r.country.id, code: r.country.code, name: r.country.name, flag: r.country.flag },
    profitUsd: Number(r.profitUsd),
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }))

  const durations: DurationRuleDto[] = durationRows.map((r) => ({
    id: r.id,
    label: r.label,
    minDays: r.minDays,
    maxDays: r.maxDays,
    profitUsd: Number(r.profitUsd),
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }))

  const overrides: OverrideRuleDto[] = overrideRows.map((r) => ({
    id: r.id,
    plan: {
      id: r.plan.id,
      slug: r.plan.slug,
      esimId: r.plan.esimId,
      name: r.plan.name,
      costUsd: Number(r.plan.costUsd),
      flag: r.plan.primaryCountry?.flag ?? null,
    },
    fixedPriceUsd: Number(r.fixedPriceUsd),
    reason: r.reason,
    isActive: r.isActive,
    updatedAt: r.updatedAt.toISOString(),
  }))

  return { global, countries, durations, overrides }
}

/** Pricing Center header stats — cheap derivations from the full rule set. */
export function deriveStats(set: PricingRuleSetDto): PricingStatsDto {
  const activeRules =
    set.countries.filter((c) => c.isActive).length +
    set.durations.filter((d) => d.isActive).length +
    set.overrides.filter((o) => o.isActive).length

  const profitRules: { label: string; profit: number }[] = [
    { label: 'Global', profit: set.global.profitUsd },
    ...set.countries.filter((c) => c.isActive).map((c) => ({ label: c.country.name, profit: c.profitUsd })),
    ...set.durations.filter((d) => d.isActive).map((d) => ({ label: d.label, profit: d.profitUsd })),
  ]
  const totalProfit = profitRules.reduce((s, r) => s + r.profit, 0)
  const highest = profitRules.reduce(
    (max, r) => (r.profit > max.profit ? r : max),
    profitRules[0] ?? { label: '—', profit: 0 },
  )
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

  return {
    activeRules,
    plansWithOverrides: set.overrides.length,
    averageProfit: profitRules.length ? round2(totalProfit / profitRules.length) : 0,
    highest: { label: highest.label, profit: round2(highest.profit) },
  }
}
