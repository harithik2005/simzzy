import { prisma } from '../../client'
import { findCountryByName } from '../common/countries-data'
import { plans as MOCK_PLANS, type MockPlan } from './mockData'

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const REGION_MAP: Record<MockPlan['region'], string> = {
  Asia: 'asia',
  Europe: 'europe',
  Americas: 'north-america', // mock collapses N+S Am; destinations preserve detail
  'Middle East': 'middle-east',
  Africa: 'africa',
  Oceania: 'oceania',
  Global: 'global',
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSlug(name: string, days: number): string {
  return `${slugify(name)}-${days}days`
}

export type ImportSummary = {
  plansUpserted: number
  destinationsLinked: number
  destinationsSkipped: { plan: string; name: string }[]
}

/* ─── Importer ──────────────────────────────────────────────────────────── */

/**
 * Import the given mock plans into the database (idempotent).
 *
 * - Upserts each plan keyed on (providerId, esimId).
 * - Stores `priceUsd` as `costUsd` (no pricing engine yet).
 * - Refreshes `plan_destinations` join rows.
 * - Skips unknown destination names (e.g. "+120 more") without failing.
 */
export async function importMockPlans(
  mocks: readonly MockPlan[] = MOCK_PLANS,
): Promise<ImportSummary> {
  // Look up provider + region/country lookup tables once.
  const provider = await prisma.esimProvider.findUniqueOrThrow({ where: { slug: 'tsim' } })

  const regions = await prisma.region.findMany({ select: { id: true, code: true } })
  const regionByCode = new Map(regions.map((r) => [r.code, r.id]))

  const countries = await prisma.country.findMany({ select: { id: true, code: true } })
  const countryByCode = new Map(countries.map((c) => [c.code, c.id]))

  const summary: ImportSummary = {
    plansUpserted: 0,
    destinationsLinked: 0,
    destinationsSkipped: [],
  }

  for (const mock of mocks) {
    const regionCode = REGION_MAP[mock.region]
    const regionId = regionByCode.get(regionCode)
    if (!regionId) throw new Error(`Missing region "${regionCode}" for plan ${mock.esimId}`)

    const primaryCountryRef = findCountryByName(mock.country)
    const primaryCountryId = primaryCountryRef ? countryByCode.get(primaryCountryRef.code) ?? null : null

    const slug = buildSlug(mock.name, mock.days)

    // Upsert the plan record.
    const plan = await prisma.plan.upsert({
      where: { providerId_esimId: { providerId: provider.id, esimId: mock.esimId } },
      update: {
        slug,
        name: mock.name,
        regionId,
        primaryCountryId,
        data: mock.data,
        fup: mock.fup,
        days: mock.days,
        apn: mock.apn,
        network: mock.network,
        speed: mock.speed,
        costUsd: mock.priceUsd,
        popular: mock.popular,
        badge: mock.badge ?? null,
        isActive: true,
        raw: mock as unknown as object,
      },
      create: {
        providerId: provider.id,
        esimId: mock.esimId,
        slug,
        name: mock.name,
        regionId,
        primaryCountryId,
        data: mock.data,
        fup: mock.fup,
        days: mock.days,
        apn: mock.apn,
        network: mock.network,
        speed: mock.speed,
        costUsd: mock.priceUsd,
        popular: mock.popular,
        badge: mock.badge ?? null,
        raw: mock as unknown as object,
      },
      select: { id: true },
    })
    summary.plansUpserted++

    // Refresh destinations: resolve names → countries, drop unknowns.
    const linked: string[] = []
    for (const destName of mock.destinations) {
      const ref = findCountryByName(destName)
      const countryId = ref ? countryByCode.get(ref.code) : undefined
      if (countryId) linked.push(countryId)
      else summary.destinationsSkipped.push({ plan: mock.esimId, name: destName })
    }

    await prisma.$transaction([
      prisma.planDestination.deleteMany({ where: { planId: plan.id } }),
      ...linked.map((countryId) =>
        prisma.planDestination.create({ data: { planId: plan.id, countryId } }),
      ),
    ])
    summary.destinationsLinked += linked.length
  }

  return summary
}
