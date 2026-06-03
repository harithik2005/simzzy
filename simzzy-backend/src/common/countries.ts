import type { Prisma } from '@prisma/client'
import { prisma } from '../../client'

export type CountryListItem = {
  id: string
  code: string
  name: string
  flag: string | null
  region: { code: string; name: string }
  planCount: number
}

export type CountryListFilters = {
  /** Region code (e.g. 'asia') or human-readable name. */
  region?: string
  /** Free-text search on country name or code. */
  q?: string
  /** Only include countries with at least one active plan. */
  withPlansOnly?: boolean
}

function buildWhere(filters: CountryListFilters | undefined): Prisma.CountryWhereInput {
  const where: Prisma.CountryWhereInput = {}
  if (!filters) return where
  const ands: Prisma.CountryWhereInput[] = []

  if (filters.region) {
    const r = filters.region.toLowerCase()
    ands.push({
      region: { is: { OR: [{ code: r }, { name: { equals: filters.region, mode: 'insensitive' } }] } },
    })
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { equals: q.toUpperCase() } },
      ],
    })
  }

  if (filters.withPlansOnly) {
    ands.push({ planDestinations: { some: { plan: { isActive: true, deletedAt: null } } } })
  }

  if (ands.length) where.AND = ands
  return where
}

/**
 * List countries with their region + active plan counts (via PlanDestination).
 * Ordered alphabetically. The query is a single aggregate-friendly call.
 */
export async function listCountries(
  filters?: CountryListFilters,
): Promise<CountryListItem[]> {
  const rows = await prisma.country.findMany({
    where: buildWhere(filters),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      flag: true,
      region: { select: { code: true, name: true } },
      _count: {
        select: {
          planDestinations: { where: { plan: { isActive: true, deletedAt: null } } },
        },
      },
    },
  })

  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    flag: c.flag,
    region: { code: c.region.code, name: c.region.name },
    planCount: c._count.planDestinations,
  }))
}

export async function getCountryByCode(code: string): Promise<CountryListItem | null> {
  const row = await prisma.country.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      id: true,
      code: true,
      name: true,
      flag: true,
      region: { select: { code: true, name: true } },
      _count: {
        select: {
          planDestinations: { where: { plan: { isActive: true, deletedAt: null } } },
        },
      },
    },
  })
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    flag: row.flag,
    region: { code: row.region.code, name: row.region.name },
    planCount: row._count.planDestinations,
  }
}
