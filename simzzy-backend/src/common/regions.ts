import { prisma } from '../../client'

export type RegionListItem = {
  id: string
  code: string
  name: string
  sortOrder: number
  countryCount: number
  planCount: number
}

/**
 * List all regions with country + active plan counts (cheap aggregate).
 * Ordered by `sortOrder` then name, matching the seeded reading order.
 */
export async function listRegions(): Promise<RegionListItem[]> {
  const rows = await prisma.region.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      _count: {
        select: {
          countries: true,
          plans: { where: { isActive: true, deletedAt: null } },
        },
      },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    sortOrder: r.sortOrder,
    countryCount: r._count.countries,
    planCount: r._count.plans,
  }))
}
