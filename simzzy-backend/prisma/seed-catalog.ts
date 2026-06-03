/**
 * Phase 4G.5 — catalog replacement orchestrator.
 *
 * Runs the full pipeline against Supabase, printing a report at each step:
 *   1. Backup current catalog → backups/catalog-<ts>.json
 *   2. Delete existing catalog plans (tsim) only
 *   3. Import the new XLSX catalog (plans + regions + countries)
 *   4. Import network coverage
 *
 * Touches ONLY catalog tables. Idempotent: re-running re-backs-up, re-clears,
 * and re-imports from the same JSON source.
 *
 *   npm run seed:catalog            (from simzzy-backend/)
 */
import { PrismaClient } from '@prisma/client'
import { backupCatalog, clearCatalogPlans, importCatalogPlans, importCoverage, refreshSellingPriceCache } from '../src/catalog/import'

const prisma = new PrismaClient()

async function main() {
  console.log('🗂  Phase 4G.5 — Catalog replacement\n')

  console.log('① Backing up current catalog…')
  const backup = await backupCatalog()
  console.table({
    plans: backup.planCount,
    countries: backup.countryCount,
    regions: backup.regionCount,
    plan_destinations: backup.planDestinationCount,
    plan_price_overrides: backup.planPriceOverrideCount,
  })
  console.log(`   backup written → ${backup.file}\n`)

  console.log('② Deleting existing catalog plans (tsim only)…')
  const cleared = await clearCatalogPlans()
  console.log(`   deleted ${cleared.deletedPlans} plans (+ cascaded destinations/overrides)\n`)

  console.log('③ Importing new XLSX catalog…')
  const imp = await importCatalogPlans()
  console.table({
    plans_imported: imp.plansImported,
    regions_upserted: imp.regionsUpserted,
    countries_upserted: imp.countriesUpserted,
    bundles: imp.bundles,
    daily_plans: imp.dailyPlans,
    regular_plans: imp.regularPlans,
    synthesized_ids: imp.synthesizedIds,
    failed_rows: imp.failedRows.length,
  })
  if (imp.failedRows.length) {
    console.log('   ⚠ failed rows (first 10):')
    for (const f of imp.failedRows.slice(0, 10)) console.log(`     - ${f.name}: ${f.reason}`)
  }
  console.log('')

  console.log('④ Importing network coverage…')
  const cov = await importCoverage()
  console.table({
    coverage_rows: cov.coverageImported,
    bundles: cov.bundles,
    countries: cov.countries,
    networks: cov.networks,
    skipped_no_country: cov.skippedNoCountry,
  })

  console.log('')
  console.log('⑤ Refreshing selling-price cache (pricing engine)…')
  const cache = await refreshSellingPriceCache()
  console.log(`   cachedSellingPriceUsd set for ${cache.refreshed} plans\n`)

  console.log('✅ Catalog replacement complete.')
}

main()
  .catch((e) => { console.error('❌ Catalog import failed:', e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
