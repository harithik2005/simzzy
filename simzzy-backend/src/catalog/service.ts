import { Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { calculateSellingPrice, loadActiveRules } from '../pricing'
import type { ActiveRulesSnapshot } from '../pricing'
import { DAILY_TIERS, type DataTier } from './classify'

/**
 * Catalog query layer (Phase 4G.5 / 4G.5C) powering the redesigned Browse:
 *   • destination directory (country search → destinations)
 *   • daily-plan selection engine (country + days + package → plan)
 *   • regular-plan comparison list
 *   • per-bundle network coverage (networks + 3G/4G/5G) for expandable details
 *
 * COUNTRY MERGE (4G.5C): single-country supplier bundles that share the same
 * `primaryCountry` are aggregated into ONE destination "group" (e.g. Japan,
 * Japan(Local), Japan(4 Networks), Japan(T+C) → one "Japan"). Multi-country /
 * regional bundles (EU 49, Global 108, Japan,Korea) remain separate groups. The
 * provider bundle label is preserved on every plan (`PlanCardDto.bundle`) so it
 * stays visible at plan level inside the comparison table.
 *
 * Country groups query by the indexed `primaryCountryId` column; regional groups
 * query by the bundle slug stored in `Plan.raw.destinationSlug`. No schema
 * changes. Selling prices come from the pricing engine (resolved in memory);
 * the directory is memoized in-process (catalog is static between imports).
 */

type RawMeta = {
  destination: string
  destinationSlug: string
  region: string
  isDaily: boolean
  dailyPackage: DataTier | null
  dataMb: number | null
  tier: string
}

function meta(raw: Prisma.JsonValue | null): RawMeta {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    destination: String(r.destination ?? ''),
    destinationSlug: String(r.destinationSlug ?? ''),
    region: String(r.region ?? ''),
    isDaily: r.isDaily === true,
    dailyPackage: (r.dailyPackage as DataTier) ?? null,
    dataMb: typeof r.dataMb === 'number' ? r.dataMb : null,
    tier: String(r.tier ?? ''),
  }
}

const slugPath = (slug: string) => ({ raw: { path: ['destinationSlug'], equals: slug } }) as Prisma.PlanWhereInput

/** Friendly demo URLs → real group slugs (country-group slugs after the merge). */
const SLUG_ALIASES: Record<string, string> = {
  usa: 'united-states',
  us: 'united-states',
  america: 'united-states',
  uk: 'eu-49',
  europe: 'eu-49',
  asia: 'asia-26',
  global: 'global-108',
}
export function resolveSlug(slug: string): string {
  return SLUG_ALIASES[slug.toLowerCase()] ?? slug.toLowerCase()
}

export type DestinationSummary = {
  slug: string
  /** Display name: country name for country groups, bundle label for regional groups. */
  name: string
  /** Primary bundle label (regional groups) or the country name. */
  bundle: string
  regionName: string
  isSingleCountry: boolean
  isCountryGroup: boolean
  /** Provider bundle labels aggregated into this group (≥1). */
  variants: string[]
  primaryCountry: string | null
  flag: string | null
  countryCount: number
  planCount: number
  dailyCount: number
  regularCount: number
  fromDailyUsd: number | null
  fromRegularUsd: number | null
  has5G: boolean
}

export type PlanCardDto = {
  id: string
  slug: string
  name: string
  bundle: string
  data: string
  tier: string
  days: number
  fup: string | null
  apn: string | null
  costUsd: number
  sellingPriceUsd: number
  isDaily: boolean
  dailyPackage: DataTier | null
  has5G: boolean
}

export type CoverageCountryDto = {
  name: string
  iso: string
  flag: string | null
  networks: Array<{ name: string; has3G: boolean; has4G: boolean; has5G: boolean }>
}
export type CoverageDto = {
  bundle: string
  countryCount: number
  has3G: boolean
  has4G: boolean
  has5G: boolean
  apns: string[]
  countries: CoverageCountryDto[]
}
/** Coverage keyed by provider bundle label — a country group has one entry per variant. */
export type CoverageMap = Record<string, CoverageDto>

/* ─── Group model + directory (memoized) ──────────────────────────────────── */

type Group = DestinationSummary & {
  kind: 'country' | 'bundle'
  primaryCountryId: string | null
  bundleSlug: string | null // regional groups query by this
}

let _dirCache: { at: number; entries: Group[]; bySlug: Map<string, Group> } | null = null
const DIR_TTL_MS = 5 * 60 * 1000

async function buildDirectory(): Promise<{ entries: Group[]; bySlug: Map<string, Group> }> {
  const rules = await loadActiveRules()
  const plans = await prisma.plan.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true, costUsd: true, days: true, primaryCountryId: true, raw: true,
      region: { select: { name: true } },
      primaryCountry: { select: { name: true, flag: true } },
    },
  })

  // Per-bundle coverage facts.
  const covRows = await prisma.networkCoverage.findMany({ select: { bundle: true, isoCode: true, has5G: true } })
  const bundleCountries = new Map<string, Set<string>>()
  const bundle5G = new Map<string, boolean>()
  for (const c of covRows) {
    if (!bundleCountries.has(c.bundle)) bundleCountries.set(c.bundle, new Set())
    bundleCountries.get(c.bundle)!.add(c.isoCode)
    if (c.has5G) bundle5G.set(c.bundle, true)
  }

  type Acc = {
    kind: 'country' | 'bundle'; slug: string; name: string; region: string
    primaryCountryId: string | null; primaryCountry: string | null; flag: string | null
    bundleSlug: string | null; variants: Set<string>; bundles: Set<string>
    planCount: number; dailyCount: number; regularCount: number
    minDaily: number | null; minRegular: number | null; has5G: boolean
  }
  const groups = new Map<string, Acc>()

  for (const p of plans) {
    const m = meta(p.raw)
    if (!m.destinationSlug) continue

    const isCountry = p.primaryCountryId !== null
    const key = isCountry ? `c:${p.primaryCountryId}` : `b:${m.destinationSlug}`
    let g = groups.get(key)
    if (!g) {
      g = {
        kind: isCountry ? 'country' : 'bundle',
        slug: isCountry ? slugifyName(p.primaryCountry?.name ?? m.destination) : m.destinationSlug,
        name: isCountry ? (p.primaryCountry?.name ?? m.destination) : m.destination,
        region: p.region?.name ?? m.region,
        primaryCountryId: p.primaryCountryId,
        primaryCountry: p.primaryCountry?.name ?? null,
        flag: p.primaryCountry?.flag ?? null,
        bundleSlug: isCountry ? null : m.destinationSlug,
        variants: new Set(), bundles: new Set(),
        planCount: 0, dailyCount: 0, regularCount: 0, minDaily: null, minRegular: null, has5G: false,
      }
      groups.set(key, g)
    }
    g.variants.add(m.destination)
    g.bundles.add(m.destination)
    if (bundle5G.get(m.destination)) g.has5G = true

    const sell = calculateSellingPrice(
      { planId: p.id, costUsd: Number(p.costUsd), days: p.days, primaryCountryId: p.primaryCountryId },
      rules,
    )
    g.planCount++
    if (m.isDaily) { g.dailyCount++; g.minDaily = g.minDaily === null ? sell : Math.min(g.minDaily, sell) }
    else { g.regularCount++; g.minRegular = g.minRegular === null ? sell : Math.min(g.minRegular, sell) }
  }

  // De-collision: if two groups slugify to the same value, suffix later ones.
  const used = new Set<string>()
  const entries: Group[] = []
  for (const g of groups.values()) {
    let slug = g.slug
    if (used.has(slug)) { let n = 2; while (used.has(`${slug}-${n}`)) n++; slug = `${slug}-${n}` }
    used.add(slug)

    const countryCount = g.kind === 'country'
      ? 1
      : [...g.bundles].reduce((max, b) => Math.max(max, bundleCountries.get(b)?.size ?? 0), 0)

    entries.push({
      kind: g.kind,
      slug,
      name: g.name,
      bundle: g.name,
      regionName: g.region,
      isSingleCountry: g.kind === 'country',
      isCountryGroup: g.kind === 'country',
      variants: [...g.variants].sort(),
      primaryCountry: g.primaryCountry,
      flag: g.flag,
      countryCount,
      planCount: g.planCount,
      dailyCount: g.dailyCount,
      regularCount: g.regularCount,
      fromDailyUsd: g.minDaily,
      fromRegularUsd: g.minRegular,
      has5G: g.has5G,
      primaryCountryId: g.primaryCountryId,
      bundleSlug: g.bundleSlug,
    })
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  return { entries, bySlug: new Map(entries.map((e) => [e.slug, e])) }
}

function slugifyName(input: string): string {
  return input.toLowerCase().normalize('NFKD').replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
}

async function directory() {
  if (!_dirCache || Date.now() - _dirCache.at > DIR_TTL_MS) {
    _dirCache = { at: Date.now(), ...(await buildDirectory()) }
  }
  return _dirCache
}

/** Invalidate the in-process directory cache (call after a catalog re-import). */
export function invalidateCatalogCache() { _dirCache = null }

function publicSummary(g: Group): DestinationSummary {
  const { kind: _k, primaryCountryId: _p, bundleSlug: _b, ...rest } = g
  return rest
}

export async function listDestinations(opts: { q?: string; region?: string } = {}): Promise<DestinationSummary[]> {
  const { entries } = await directory()
  let out = entries
  if (opts.region) out = out.filter((e) => e.regionName === opts.region)
  if (opts.q && opts.q.trim()) {
    const q = opts.q.trim().toLowerCase()
    const covHits = await prisma.networkCoverage.findMany({
      where: { OR: [{ countryName: { contains: q, mode: 'insensitive' } }, { isoCode: { equals: q.toUpperCase() } }] },
      select: { bundle: true }, take: 3000,
    })
    const bundles = new Set(covHits.map((c) => c.bundle))
    out = out.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.variants.some((v) => v.toLowerCase().includes(q) || bundles.has(v)),
    )
  }
  return out.map(publicSummary)
}

async function getGroup(slug: string): Promise<Group | null> {
  const { bySlug } = await directory()
  return bySlug.get(resolveSlug(slug)) ?? null
}

export async function getDestination(slug: string): Promise<DestinationSummary | null> {
  const g = await getGroup(slug)
  return g ? publicSummary(g) : null
}

/* ─── Plan queries ────────────────────────────────────────────────────────── */

function groupWhere(g: Group): Prisma.PlanWhereInput {
  return g.kind === 'country'
    ? { primaryCountryId: g.primaryCountryId }
    : slugPath(g.bundleSlug!)
}

function toCard(
  p: { id: string; slug: string; name: string; data: string; fup: string | null; apn: string | null; days: number; costUsd: Prisma.Decimal; primaryCountryId: string | null; raw: Prisma.JsonValue | null },
  rules: ActiveRulesSnapshot,
  bundle5G: Set<string>,
): PlanCardDto {
  const m = meta(p.raw)
  const sell = calculateSellingPrice({ planId: p.id, costUsd: Number(p.costUsd), days: p.days, primaryCountryId: p.primaryCountryId }, rules)
  return {
    id: p.id, slug: p.slug, name: p.name, bundle: m.destination,
    data: p.data, tier: m.tier, days: p.days, fup: p.fup, apn: p.apn,
    costUsd: Number(p.costUsd), sellingPriceUsd: sell,
    isDaily: m.isDaily, dailyPackage: m.dailyPackage, has5G: bundle5G.has(m.destination),
  }
}

const CARD_SELECT = {
  id: true, slug: true, name: true, data: true, fup: true, apn: true, days: true, costUsd: true, primaryCountryId: true, raw: true,
} satisfies Prisma.PlanSelect

async function bundle5GSet(bundles: string[]): Promise<Set<string>> {
  const rows = await prisma.networkCoverage.findMany({
    where: { bundle: { in: bundles }, has5G: true }, select: { bundle: true }, distinct: ['bundle'],
  })
  return new Set(rows.map((r) => r.bundle))
}

/** Regular (non-daily) plans for a destination group, for the comparison layout. */
export async function getRegularPlans(slug: string): Promise<PlanCardDto[]> {
  const g = await getGroup(slug)
  if (!g) return []
  const [rules, b5g] = await Promise.all([loadActiveRules(), bundle5GSet(g.variants)])
  const plans = await prisma.plan.findMany({
    where: { AND: [groupWhere(g), { raw: { path: ['isDaily'], equals: false } }, { isActive: true, deletedAt: null }] },
    orderBy: [{ days: 'asc' }, { costUsd: 'asc' }],
    select: CARD_SELECT,
  })
  return plans.map((p) => toCard(p, rules, b5g))
}

export type DailyPlansResult = {
  destination: DestinationSummary
  days: number[]
  packages: DataTier[]
  plans: PlanCardDto[]
}

/** All daily plans for a destination group + available Days / Package options. */
export async function getDailyPlans(slug: string): Promise<DailyPlansResult | null> {
  const g = await getGroup(slug)
  if (!g) return null
  const [rules, b5g] = await Promise.all([loadActiveRules(), bundle5GSet(g.variants)])
  const plans = await prisma.plan.findMany({
    where: { AND: [groupWhere(g), { raw: { path: ['isDaily'], equals: true } }, { isActive: true, deletedAt: null }] },
    orderBy: [{ days: 'asc' }, { costUsd: 'asc' }],
    select: CARD_SELECT,
  })
  const cards = plans.map((p) => toCard(p, rules, b5g))
  const days = [...new Set(cards.map((c) => c.days))].sort((a, b) => a - b)
  const packages = DAILY_TIERS.filter((t) => cards.some((c) => c.dailyPackage === t))
  return { destination: publicSummary(g), days, packages, plans: cards }
}

/**
 * Daily Plan Selection Engine — group + days + package → matching plan (cheapest
 * across the group's variant bundles). Pure DB lookup; no mock data.
 */
export async function selectDailyPlan(slug: string, days: number, pkg: string): Promise<PlanCardDto | null> {
  const g = await getGroup(slug)
  if (!g) return null
  const [rules, b5g] = await Promise.all([loadActiveRules(), bundle5GSet(g.variants)])
  const plans = await prisma.plan.findMany({
    where: {
      AND: [
        groupWhere(g),
        { raw: { path: ['isDaily'], equals: true } },
        { raw: { path: ['dailyPackage'], equals: pkg } },
        { days },
        { isActive: true, deletedAt: null },
      ],
    },
    orderBy: { costUsd: 'asc' },
    select: CARD_SELECT,
  })
  if (plans.length === 0) return null
  return toCard(plans[0], rules, b5g)
}

/* ─── Coverage / network details ──────────────────────────────────────────── */

function isoFlag(iso: string): string | null {
  const code = (iso ?? '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  const A = 0x1f1e6
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65)
}

function buildCoverage(bundle: string, rows: Array<{ countryName: string; isoCode: string; networkName: string; apn: string | null; has3G: boolean; has4G: boolean; has5G: boolean }>): CoverageDto {
  const byCountry = new Map<string, CoverageCountryDto>()
  const apns = new Set<string>()
  let has3G = false, has4G = false, has5G = false
  for (const r of rows) {
    if (r.apn) apns.add(r.apn)
    if (r.has3G) has3G = true
    if (r.has4G) has4G = true
    if (r.has5G) has5G = true
    let c = byCountry.get(r.isoCode)
    if (!c) { c = { name: r.countryName, iso: r.isoCode, flag: isoFlag(r.isoCode), networks: [] }; byCountry.set(r.isoCode, c) }
    c.networks.push({ name: r.networkName, has3G: r.has3G, has4G: r.has4G, has5G: r.has5G })
  }
  return { bundle, countryCount: byCountry.size, has3G, has4G, has5G, apns: [...apns], countries: [...byCountry.values()] }
}

/** Coverage for a single bundle (kept for compatibility / direct use). */
export async function getCoverage(slug: string): Promise<CoverageDto | null> {
  const g = await getGroup(slug)
  if (!g) return null
  const bundle = g.kind === 'bundle' ? g.bundle : g.variants[0]
  const rows = await prisma.networkCoverage.findMany({ where: { bundle }, orderBy: [{ countryName: 'asc' }, { networkName: 'asc' }] })
  return buildCoverage(bundle, rows)
}

/**
 * Coverage for every variant bundle in the group, keyed by bundle label — so a
 * merged country page can show the correct networks for each plan row's bundle
 * (Japan(Local) vs Japan(4 Networks) have different networks).
 */
export async function getCoverageMap(slug: string): Promise<CoverageMap> {
  const g = await getGroup(slug)
  if (!g) return {}
  const rows = await prisma.networkCoverage.findMany({
    where: { bundle: { in: g.variants } },
    orderBy: [{ countryName: 'asc' }, { networkName: 'asc' }],
  })
  const byBundle = new Map<string, typeof rows>()
  for (const r of rows) {
    if (!byBundle.has(r.bundle)) byBundle.set(r.bundle, [])
    byBundle.get(r.bundle)!.push(r)
  }
  const map: CoverageMap = {}
  for (const b of g.variants) map[b] = buildCoverage(b, byBundle.get(b) ?? [])
  return map
}
