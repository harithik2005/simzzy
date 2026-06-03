import type { Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { findCountryByName } from '../common/countries-data'
import type {
  PlanDetailDto,
  PlanListFilters,
  PlanListItem,
  PlanListParams,
  PlanListResult,
  PlanSort,
} from './types'

const DEFAULT_PER_PAGE = 24
const MAX_PER_PAGE = 100

const SORT_ORDER: Record<PlanSort, Prisma.PlanOrderByWithRelationInput[]> = {
  popular:         [{ popular: 'desc' }, { name: 'asc' }],
  'price-asc':     [{ costUsd: 'asc' }],
  'price-desc':    [{ costUsd: 'desc' }],
  'data-desc':     [{ days: 'desc' }, { name: 'asc' }], // proxy: no parsed-GB column yet
  'duration-desc': [{ days: 'desc' }],
}

/* ─── DTO mapper ────────────────────────────────────────────────────────── */

type PlanListRow = Prisma.PlanGetPayload<{
  select: {
    id: true
    slug: true
    esimId: true
    name: true
    data: true
    days: true
    speed: true
    network: true
    popular: true
    badge: true
    costUsd: true
    cachedSellingPriceUsd: true
    region: { select: { code: true; name: true } }
    primaryCountry: { select: { name: true; flag: true } }
  }
}>

function toListItem(p: PlanListRow): PlanListItem {
  return {
    id: p.id,
    slug: p.slug,
    esimId: p.esimId,
    name: p.name,
    data: p.data,
    days: p.days,
    speed: p.speed,
    network: p.network,
    popular: p.popular,
    badge: p.badge,
    costUsd: Number(p.costUsd),
    sellingPriceUsd: p.cachedSellingPriceUsd === null ? null : Number(p.cachedSellingPriceUsd),
    region: p.region ? { code: p.region.code, name: p.region.name } : null,
    country: p.primaryCountry?.name ?? null,
    flag: p.primaryCountry?.flag ?? null,
  }
}

const PLAN_LIST_SELECT = {
  id: true,
  slug: true,
  esimId: true,
  name: true,
  data: true,
  days: true,
  speed: true,
  network: true,
  popular: true,
  badge: true,
  costUsd: true,
  cachedSellingPriceUsd: true,
  region: { select: { code: true, name: true } },
  primaryCountry: { select: { name: true, flag: true } },
} satisfies Prisma.PlanSelect

/* ─── Filter → Prisma WHERE ────────────────────────────────────────────── */

const DURATION_BUCKETS: Record<NonNullable<PlanListFilters['duration']>, { min: number; max?: number }> = {
  '1-7':   { min: 1,  max: 7 },
  '7-15':  { min: 7,  max: 15 },
  '15-30': { min: 15, max: 30 },
  '30+':   { min: 30 },
}

function buildWhere(filters: PlanListFilters | undefined): Prisma.PlanWhereInput {
  const where: Prisma.PlanWhereInput = { isActive: true, deletedAt: null }

  if (!filters) return where
  const ands: Prisma.PlanWhereInput[] = []

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { primaryCountry: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { network: { contains: q, mode: 'insensitive' } },
        { region: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }

  if (filters.country) {
    const ref = findCountryByName(filters.country)
    const code = (ref?.code ?? filters.country).toUpperCase()
    ands.push({
      OR: [
        { primaryCountry: { is: { code } } },
        { destinations: { some: { country: { is: { code } } } } },
      ],
    })
  }

  if (filters.region) {
    const r = filters.region.toLowerCase()
    ands.push({
      region: { is: { OR: [{ code: r }, { name: { equals: filters.region, mode: 'insensitive' } }] } },
    })
  }

  if (filters.provider) {
    ands.push({ provider: { is: { slug: filters.provider.toLowerCase() } } })
  }

  if (filters.data && filters.data.toLowerCase() !== 'all') {
    ands.push({ data: { equals: filters.data, mode: 'insensitive' } })
  }

  // Duration
  let minDays = filters.minDays
  let maxDays = filters.maxDays
  if (filters.duration) {
    const b = DURATION_BUCKETS[filters.duration]
    minDays = minDays ?? b.min
    maxDays = maxDays ?? b.max
  }
  if (minDays !== undefined) ands.push({ days: { gte: minDays } })
  if (maxDays !== undefined) ands.push({ days: { lte: maxDays } })

  if (filters.minPriceUsd !== undefined) ands.push({ costUsd: { gte: filters.minPriceUsd } })
  if (filters.maxPriceUsd !== undefined) ands.push({ costUsd: { lte: filters.maxPriceUsd } })

  if (ands.length) where.AND = ands
  return where
}

/* ─── Public service ────────────────────────────────────────────────────── */

export async function listPlans(params: PlanListParams = {}): Promise<PlanListResult> {
  const page = Math.max(1, params.page ?? 1)
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, params.perPage ?? DEFAULT_PER_PAGE))
  const sort = params.sort ?? 'popular'

  const where = buildWhere(params.filters)
  const orderBy = SORT_ORDER[sort]

  const [total, rows] = await prisma.$transaction([
    prisma.plan.count({ where }),
    prisma.plan.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: PLAN_LIST_SELECT,
    }),
  ])

  return {
    items: rows.map(toListItem),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function searchPlans(
  q: string,
  params: Omit<PlanListParams, 'filters'> & { filters?: Omit<PlanListFilters, 'q'> } = {},
): Promise<PlanListResult> {
  return listPlans({ ...params, filters: { ...params.filters, q } })
}

export async function getPlanBySlug(slug: string): Promise<PlanDetailDto | null> {
  const plan = await prisma.plan.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      ...PLAN_LIST_SELECT,
      fup: true,
      apn: true,
      provider: { select: { slug: true, name: true } },
      destinations: {
        select: { country: { select: { code: true, name: true, flag: true } } },
        orderBy: { country: { name: 'asc' } },
      },
    },
  })
  if (!plan) return null

  return {
    ...toListItem(plan),
    fup: plan.fup,
    apn: plan.apn,
    provider: { slug: plan.provider.slug, name: plan.provider.name },
    destinations: plan.destinations.map((d) => ({ code: d.country.code, name: d.country.name, flag: d.country.flag })),
  }
}

/** Convenience for the landing "Best selling plans" section. */
export async function getFeaturedPlans(limit = 3): Promise<PlanListItem[]> {
  const rows = await prisma.plan.findMany({
    where: { isActive: true, deletedAt: null, popular: true },
    orderBy: [{ costUsd: 'asc' }, { name: 'asc' }],
    take: limit,
    select: PLAN_LIST_SELECT,
  })
  return rows.map(toListItem)
}
