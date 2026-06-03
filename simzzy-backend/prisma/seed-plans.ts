/**
 * Simzzy — plan catalog seeder (idempotent).
 *
 * Runs `importMockPlans()` so every mock plan ends up as a row in `plans`
 * with its `plan_destinations` join refreshed. Safe to re-run: each plan is
 * upserted on (providerId, esimId), then destinations are re-linked atomically.
 *
 * Prerequisite: run `npm run seed` first so regions, countries, and the tSIM
 * provider exist.
 */
import { PrismaClient } from '@prisma/client'
import { importMockPlans } from '../src/plans/import'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Importing mock plan catalog into Supabase (idempotent)...\n')

  const summary = await importMockPlans()

  const planCount = await prisma.plan.count({ where: { isActive: true, deletedAt: null } })
  const destCount = await prisma.planDestination.count()

  console.log('\n📊 Import summary:')
  console.table({
    plans_upserted: summary.plansUpserted,
    destinations_linked: summary.destinationsLinked,
    destinations_skipped: summary.destinationsSkipped.length,
    active_plans_total: planCount,
    plan_destinations_total: destCount,
  })

  if (summary.destinationsSkipped.length) {
    console.log('\n⚠ Unknown destinations (no matching country, skipped):')
    for (const skip of summary.destinationsSkipped) {
      console.log(`   - plan ${skip.plan}: "${skip.name}"`)
    }
  }

  console.log('\n✅ Plan import complete.')
}

main()
  .catch((e) => {
    console.error('❌ Plan import failed:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
