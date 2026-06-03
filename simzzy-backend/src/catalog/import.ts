import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { loadActiveRules, resolveOne } from '../pricing'
import { classifyData, isoToFlag, regionCode, slugify } from './classify'

/**
 * Phase 4G.5 catalog importer.
 *
 * Source of truth: the parsed XLSX in `./source/{plans,coverage}.json` (checked
 * in so the import never depends on Excel at runtime). Imports run against the
 * existing schema — only `network_coverage` was added. Touches ONLY catalog
 * tables (plans, plan_destinations, regions, countries, network_coverage);
 * never users/orders/pricing-rules/settings/providers/audit.
 *
 * Strategy: country↔bundle relationships are stored once in `network_coverage`
 * (keyed by the supplier bundle label), and each plan carries its bundle in
 * `Plan.raw.destinationSlug`. This avoids exploding `plan_destinations` to
 * hundreds of thousands of rows for regional bundles. Single-country bundles
 * still set `Plan.primaryCountryId`.
 */

const PROVIDER_SLUG = 'tsim'
const SOURCE_TAG = 'channel-id212'
const CHUNK = 500

type SourcePlan = {
  region: string
  destination: string
  data: string
  fup: string | null
  days: number | null
  priceUsd: number | null
  apn: string | null
  name: string
  esimId: string | null
}
type SourceCoverage = {
  region: string
  bundle: string
  country: string
  iso: string
  network: string
  apn: string | null
  has3G: boolean
  has4G: boolean
  has5G: boolean
}

function loadSource(): { plans: SourcePlan[]; coverage: SourceCoverage[] } {
  const dir = join(__dirname, 'source')
  const plans = JSON.parse(readFileSync(join(dir, 'plans.json'), 'utf-8')) as SourcePlan[]
  const coverage = JSON.parse(readFileSync(join(dir, 'coverage.json'), 'utf-8')) as SourceCoverage[]
  return { plans, coverage }
}

function synthEsimId(name: string): string {
  return 'syn-' + createHash('sha1').update(name).digest('hex').slice(0, 24)
}

async function getProviderId(): Promise<string> {
  const p = await prisma.esimProvider.findUnique({ where: { slug: PROVIDER_SLUG }, select: { id: true } })
  if (!p) throw new Error(`Provider "${PROVIDER_SLUG}" not found — run \`npm run seed\` first.`)
  return p.id
}

/* ─── Step 1: backup ──────────────────────────────────────────────────────── */

export type BackupResult = {
  file: string
  planCount: number
  countryCount: number
  regionCount: number
  planDestinationCount: number
  planPriceOverrideCount: number
}

export async function backupCatalog(): Promise<BackupResult> {
  const [plans, regions, countries, destinations, overrides] = await Promise.all([
    prisma.plan.findMany(),
    prisma.region.findMany(),
    prisma.country.findMany(),
    prisma.planDestination.findMany(),
    prisma.planPriceOverride.findMany(),
  ])
  const dir = join(__dirname, '..', '..', 'backups')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `catalog-${stamp}.json`)
  writeFileSync(
    file,
    JSON.stringify(
      { takenAt: new Date().toISOString(), plans, regions, countries, destinations, overrides },
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      2,
    ),
    'utf-8',
  )
  return {
    file,
    planCount: plans.length,
    countryCount: countries.length,
    regionCount: regions.length,
    planDestinationCount: destinations.length,
    planPriceOverrideCount: overrides.length,
  }
}

/* ─── Step 2: cleanup (catalog plans only) ────────────────────────────────── */

export async function clearCatalogPlans(): Promise<{ deletedPlans: number }> {
  const providerId = await getProviderId()
  // Deleting plans cascades plan_destinations + plan_price_overrides (per schema).
  // Orders/reviews keep their snapshots (planId → SetNull). Nothing else touched.
  const res = await prisma.plan.deleteMany({ where: { providerId } })
  return { deletedPlans: res.count }
}

/* ─── Step 3: import plans ────────────────────────────────────────────────── */

export type ImportReport = {
  plansImported: number
  regionsUpserted: number
  countriesUpserted: number
  bundles: number
  dailyPlans: number
  regularPlans: number
  synthesizedIds: number
  failedRows: Array<{ name: string; reason: string }>
  missingFields: Record<string, number>
}

export async function importCatalogPlans(): Promise<ImportReport> {
  const { plans, coverage } = loadSource()
  const providerId = await getProviderId()

  // 1) Regions — union of plan + coverage region labels.
  const regionLabels = new Map<string, string>() // code -> label
  for (const r of [...plans.map((p) => p.region), ...coverage.map((c) => c.region)]) {
    if (r) regionLabels.set(regionCode(r), r)
  }
  let sort = 100
  for (const [code, label] of regionLabels) {
    await prisma.region.upsert({
      where: { code },
      update: { name: label },
      create: { code, name: label, sortOrder: sort++ },
    })
  }
  const regionRows = await prisma.region.findMany({ select: { id: true, code: true } })
  const regionByCode = new Map(regionRows.map((r) => [r.code, r.id]))

  // 2) Countries — from coverage (iso → name + region). Existing rows are left
  //    untouched (no region/flag clobber); only missing countries are created.
  const isoInfo = new Map<string, { name: string; region: string }>()
  for (const c of coverage) {
    if (c.iso && !isoInfo.has(c.iso)) isoInfo.set(c.iso, { name: c.country, region: c.region })
  }
  let countriesUpserted = 0
  for (const [iso, info] of isoInfo) {
    const regionId = regionByCode.get(regionCode(info.region))
    if (!regionId) continue
    await prisma.country.upsert({
      where: { code: iso },
      update: {},
      create: { code: iso, name: info.name, flag: isoToFlag(iso), regionId },
    })
    countriesUpserted++
  }
  const countryRows = await prisma.country.findMany({ select: { id: true, code: true } })
  const countryByIso = new Map(countryRows.map((c) => [c.code, c.id]))

  // 3) bundle → set of ISO codes (for single-country detection + primaryCountry).
  const bundleIsos = new Map<string, Set<string>>()
  for (const c of coverage) {
    if (!bundleIsos.has(c.bundle)) bundleIsos.set(c.bundle, new Set())
    if (c.iso) bundleIsos.get(c.bundle)!.add(c.iso)
  }

  // 4) Build plan rows.
  const failedRows: ImportReport['failedRows'] = []
  const missingFields: Record<string, number> = {}
  const seenSlugs = new Set<string>()
  const seenEsim = new Set<string>()
  let synthesizedIds = 0
  let dailyPlans = 0
  let regularPlans = 0

  const rows: Prisma.PlanCreateManyInput[] = []
  for (const p of plans) {
    const regionId = regionByCode.get(regionCode(p.region))
    if (!regionId) { failedRows.push({ name: p.name, reason: `unmapped region "${p.region}"` }); continue }
    if (p.priceUsd === null || p.days === null) { failedRows.push({ name: p.name, reason: 'missing price/days' }); continue }

    let esimId = p.esimId
    if (!esimId) { esimId = synthEsimId(p.name); synthesizedIds++; missingFields.esimId = (missingFields.esimId ?? 0) + 1 }
    if (seenEsim.has(esimId)) { failedRows.push({ name: p.name, reason: `duplicate esimId ${esimId}` }); continue }
    seenEsim.add(esimId)

    let slug = slugify(p.name) || slugify(esimId)
    if (seenSlugs.has(slug)) { let n = 2; while (seenSlugs.has(`${slug}-${n}`)) n++; slug = `${slug}-${n}` }
    seenSlugs.add(slug)

    const cls = classifyData(p.data)
    cls.isDaily ? dailyPlans++ : regularPlans++

    const isos = bundleIsos.get(p.destination)
    const primaryCountryId = isos && isos.size === 1 ? countryByIso.get([...isos][0]) ?? null : null

    rows.push({
      providerId,
      esimId,
      slug,
      name: p.name,
      regionId,
      primaryCountryId,
      data: p.data,
      fup: p.fup,
      days: p.days,
      apn: p.apn,
      network: null,
      costUsd: new Prisma.Decimal(p.priceUsd),
      popular: false,
      isActive: true,
      raw: {
        destination: p.destination,
        destinationSlug: slugify(p.destination),
        region: p.region,
        isDaily: cls.isDaily,
        dailyPackage: cls.dailyPackage,
        dataMb: cls.mb,
        tier: cls.tier,
        fup: p.fup,
        source: SOURCE_TAG,
      },
    })
  }

  // 5) Bulk insert in chunks (createMany — far faster than per-row upsert; the
  //    table was just cleared so there are no conflicts).
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.plan.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true })
  }

  return {
    plansImported: rows.length,
    regionsUpserted: regionLabels.size,
    countriesUpserted,
    bundles: bundleIsos.size,
    dailyPlans,
    regularPlans,
    synthesizedIds,
    failedRows,
    missingFields,
  }
}

/* ─── Step 4: import coverage ─────────────────────────────────────────────── */

export type CoverageReport = {
  coverageImported: number
  skippedNoCountry: number
  bundles: number
  countries: number
  networks: number
}

export async function importCoverage(): Promise<CoverageReport> {
  const { coverage } = loadSource()
  const countryRows = await prisma.country.findMany({ select: { id: true, code: true } })
  const countryByIso = new Map(countryRows.map((c) => [c.code, c.id]))

  await prisma.networkCoverage.deleteMany({})

  const seen = new Set<string>()
  let skipped = 0
  const bundles = new Set<string>()
  const networks = new Set<string>()
  const rows: Prisma.NetworkCoverageCreateManyInput[] = []
  for (const c of coverage) {
    const countryId = c.iso ? countryByIso.get(c.iso) : undefined
    if (!countryId) { skipped++; continue }
    const key = `${c.bundle}|${c.iso}|${c.network}`
    if (seen.has(key)) continue
    seen.add(key)
    bundles.add(c.bundle)
    networks.add(c.network)
    rows.push({
      bundle: c.bundle,
      countryId,
      countryName: c.country,
      isoCode: c.iso,
      networkName: c.network,
      apn: c.apn,
      has3G: c.has3G,
      has4G: c.has4G,
      has5G: c.has5G,
    })
  }
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.networkCoverage.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true })
  }
  const countries = new Set(rows.map((r) => r.isoCode)).size
  return { coverageImported: rows.length, skippedNoCountry: skipped, bundles: bundles.size, countries, networks: networks.size }
}

/* ─── Selling-price cache ─────────────────────────────────────────────────── */

/**
 * Populate `plans.cachedSellingPriceUsd` for every active plan so the
 * checkout / plan-detail / admin paths (which read the cached column) show the
 * correct selling price.
 *
 * Prices are resolved IN MEMORY via the pricing engine's pure resolver
 * (`loadActiveRules` + `resolveOne`) and written back with ONE bulk SQL UPDATE
 * per chunk (a `VALUES` join) — avoiding the per-row round-trips that make the
 * engine's own `refreshAllCaches` impractical for 9k+ plans over the Supabase
 * connection. The engine is used, not modified; the column semantics match.
 */
export async function refreshSellingPriceCache(): Promise<{ refreshed: number }> {
  const rules = await loadActiveRules()
  const plans = await prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, costUsd: true, days: true, primaryCountryId: true },
  })
  const UUID_RE = /^[0-9a-f-]{36}$/i
  let refreshed = 0
  for (let i = 0; i < plans.length; i += CHUNK) {
    const tuples: string[] = []
    for (const p of plans.slice(i, i + CHUNK)) {
      if (!UUID_RE.test(p.id)) continue // guard: ids are DB-generated uuids
      const price = resolveOne(
        { planId: p.id, costUsd: Number(p.costUsd), days: p.days, primaryCountryId: p.primaryCountryId },
        rules,
      ).sellingPriceUsd
      // Values are system-generated (uuid + finite number) — safe to inline.
      tuples.push(`('${p.id}', ${Number.isFinite(price) ? price : 'NULL'}::numeric)`)
    }
    if (tuples.length === 0) continue
    refreshed += await prisma.$executeRawUnsafe(
      `UPDATE plans AS p SET "cachedSellingPriceUsd" = c.price
       FROM (VALUES ${tuples.join(',')}) AS c(id, price)
       WHERE p.id = c.id`,
    )
  }
  return { refreshed }
}
