/**
 * Simzzy — pricing rules seed + cache backfill (idempotent).
 *
 * Seeds the same initial rule set the frontend Pricing Center has been mocking:
 *   - Global +$2 (already created by seed.ts, kept here for completeness)
 *   - Country: Japan +$3, US +$4, UK +$4, UAE +$5
 *   - Duration: 1–3 +$2, 4–7 +$3, 8–15 +$4, 30+ +$5
 *   - Override: Japan 5GB → $12.99
 *
 * After upserting rules, refreshes `plans.cachedSellingPriceUsd` for every
 * active plan so the storefront shows the resolved price immediately.
 *
 * Safe to re-run.
 */
import { PrismaClient } from '@prisma/client'
import { refreshAllCaches } from '../src/pricing/service'
import {
  updateGlobalRule,
  upsertCountryRule,
  upsertPlanOverride,
  createDurationRule,
} from '../src/pricing/mutations'

const prisma = new PrismaClient()

const SYSTEM_ACTOR = { actorId: null } as const

const COUNTRY_RULES: Array<{ code: string; profit: number }> = [
  { code: 'JP', profit: 3 },
  { code: 'US', profit: 4 },
  { code: 'GB', profit: 4 },
  { code: 'AE', profit: 5 },
]

const DURATION_RULES = [
  { label: '1–3 Days',  minDays: 1,  maxDays: 3,    profitUsd: 2 },
  { label: '4–7 Days',  minDays: 4,  maxDays: 7,    profitUsd: 3 },
  { label: '8–15 Days', minDays: 8,  maxDays: 15,   profitUsd: 4 },
  { label: '30+ Days',  minDays: 30, maxDays: null, profitUsd: 5 },
]

const OVERRIDES = [
  { esimId: 'TS-JP-5GB-30D', fixedPriceUsd: 12.99, reason: 'Seasonal pricing — Japan 5GB hero plan' },
]

async function seedGlobal() {
  await updateGlobalRule({ profitUsd: 2, isActive: true, note: 'Default global profit' }, SYSTEM_ACTOR)
  console.log('  ✓ Global rule: +$2.00')
}

async function seedCountryRules() {
  let upserted = 0
  for (const { code, profit } of COUNTRY_RULES) {
    const country = await prisma.country.findUnique({ where: { code } })
    if (!country) {
      console.warn(`    ⚠ skip country rule — country ${code} not found`)
      continue
    }
    await upsertCountryRule(
      { countryId: country.id, profitUsd: profit, isActive: true },
      SYSTEM_ACTOR,
    )
    upserted++
  }
  console.log(`  ✓ Country rules: ${upserted}/${COUNTRY_RULES.length}`)
}

async function seedDurationRules() {
  let upserted = 0
  for (const rule of DURATION_RULES) {
    const existing = await prisma.pricingDurationRule.findFirst({
      where: { label: rule.label, minDays: rule.minDays, maxDays: rule.maxDays },
    })
    if (existing) {
      // Keep idempotent — refresh profit/active if the seed values changed.
      if (Number(existing.profitUsd) !== rule.profitUsd || !existing.isActive) {
        await prisma.pricingDurationRule.update({
          where: { id: existing.id },
          data: { profitUsd: rule.profitUsd, isActive: true },
        })
      }
    } else {
      await createDurationRule({ ...rule, isActive: true }, SYSTEM_ACTOR)
    }
    upserted++
  }
  console.log(`  ✓ Duration rules: ${upserted}`)
}

async function seedOverrides() {
  let upserted = 0
  for (const ov of OVERRIDES) {
    const plan = await prisma.plan.findFirst({ where: { esimId: ov.esimId } })
    if (!plan) {
      console.warn(`    ⚠ skip override — plan ${ov.esimId} not found`)
      continue
    }
    await upsertPlanOverride(
      { planId: plan.id, fixedPriceUsd: ov.fixedPriceUsd, reason: ov.reason, isActive: true },
      SYSTEM_ACTOR,
    )
    upserted++
  }
  console.log(`  ✓ Plan overrides: ${upserted}/${OVERRIDES.length}`)
}

async function refreshCaches() {
  const n = await refreshAllCaches()
  console.log(`  ✓ Refreshed cachedSellingPriceUsd for ${n} active plans`)
}

async function reportRules() {
  // Sequential — pooler is flaky under bursty parallel counts.
  const gl = await prisma.pricingGlobalRule.findUnique({ where: { id: 1 } })
  const ctr = await prisma.pricingCountryRule.count({ where: { isActive: true } })
  const dur = await prisma.pricingDurationRule.count({ where: { isActive: true } })
  const ov = await prisma.planPriceOverride.count({ where: { isActive: true } })
  console.log('\n📊 Rule counts after seed:')
  console.table({
    global_profit_usd: gl ? Number(gl.profitUsd) : null,
    active_country_rules: ctr,
    active_duration_rules: dur,
    active_overrides: ov,
  })
}

async function main() {
  console.log('🌱 Seeding pricing rules + refreshing cached prices (idempotent)...\n')
  await seedGlobal()
  await seedCountryRules()
  await seedDurationRules()
  await seedOverrides()
  await refreshCaches()
  await reportRules()
  console.log('\n✅ Pricing seed complete.')
}

main()
  .catch((e) => {
    console.error('❌ Pricing seed failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
