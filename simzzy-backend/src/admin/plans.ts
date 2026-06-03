import { Prisma, ProviderStatus } from '@prisma/client'
import { prisma } from '../../client'
import { AdminActorContext, AdminError, writeAudit } from './_shared'

/**
 * Plan catalog operations (admin).
 *
 * Read/search/filter the catalog, toggle a plan active/inactive, inspect the
 * provider metadata behind each plan, and run a **sync preparation** dry-run.
 *
 * Live tSIM catalog sync is Phase 4H — `prepareProviderSync` deliberately does
 * NOT contact any provider. It reports what a sync *would* touch (provider
 * health, current plan counts, last sync time) so an operator can confirm
 * readiness, and records the intent in the audit log.
 *
 * Pricing: the selling price shown is `Plan.cachedSellingPriceUsd`, the value
 * the pricing engine pre-computes; cost is `Plan.costUsd`. Margin is derived.
 */

export type AdminPlanDto = {
  id: string
  slug: string
  esimId: string
  name: string
  providerId: string
  providerName: string
  providerSlug: string
  regionName: string
  primaryCountry: string | null
  primaryCountryFlag: string | null
  data: string
  days: number
  network: string | null
  costUsd: number
  sellingPriceUsd: number | null
  marginUsd: number | null
  marginPct: number | null
  isActive: boolean
  popular: boolean
  badge: string | null
  hasOverride: boolean
  createdAt: string
}

export type PlanFilters = {
  q?: string
  providerId?: string
  regionId?: string
  active?: boolean
}

export type PlanFilterOptions = {
  providers: Array<{ id: string; name: string; slug: string }>
  regions: Array<{ id: string; name: string }>
}

export type SyncPreparationDto = {
  providerId: string
  providerSlug: string
  providerName: string
  providerStatus: ProviderStatus
  ready: boolean
  totalPlans: number
  activePlans: number
  lastSyncedAt: string | null
  message: string
}

const LIST_SELECT = {
  id: true,
  slug: true,
  esimId: true,
  name: true,
  providerId: true,
  data: true,
  days: true,
  network: true,
  costUsd: true,
  cachedSellingPriceUsd: true,
  isActive: true,
  popular: true,
  badge: true,
  createdAt: true,
  provider: { select: { name: true, slug: true } },
  region: { select: { name: true } },
  primaryCountry: { select: { name: true, flag: true } },
  override: { select: { id: true, isActive: true } },
} satisfies Prisma.PlanSelect

type ListRow = Prisma.PlanGetPayload<{ select: typeof LIST_SELECT }>

function rowToDto(p: ListRow): AdminPlanDto {
  const cost = Number(p.costUsd)
  const selling = p.cachedSellingPriceUsd !== null ? Number(p.cachedSellingPriceUsd) : null
  const marginUsd = selling !== null ? Math.round((selling - cost) * 100) / 100 : null
  const marginPct = selling !== null && selling > 0 ? Math.round(((selling - cost) / selling) * 1000) / 10 : null
  return {
    id: p.id,
    slug: p.slug,
    esimId: p.esimId,
    name: p.name,
    providerId: p.providerId,
    providerName: p.provider.name,
    providerSlug: p.provider.slug,
    regionName: p.region.name,
    primaryCountry: p.primaryCountry?.name ?? null,
    primaryCountryFlag: p.primaryCountry?.flag ?? null,
    data: p.data,
    days: p.days,
    network: p.network,
    costUsd: cost,
    sellingPriceUsd: selling,
    marginUsd,
    marginPct,
    isActive: p.isActive,
    popular: p.popular,
    badge: p.badge,
    hasOverride: p.override !== null && p.override.isActive,
    createdAt: p.createdAt.toISOString(),
  }
}

export async function listAdminPlans(filters: PlanFilters = {}, limit = 300): Promise<AdminPlanDto[]> {
  const where: Prisma.PlanWhereInput = { deletedAt: null }
  const ands: Prisma.PlanWhereInput[] = []
  if (filters.providerId) ands.push({ providerId: filters.providerId })
  if (filters.regionId) ands.push({ regionId: filters.regionId })
  if (typeof filters.active === 'boolean') ands.push({ isActive: filters.active })
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { esimId: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { primaryCountry: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }
  if (ands.length) where.AND = ands

  const rows = await prisma.plan.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    take: Math.min(1000, Math.max(1, limit)),
    select: LIST_SELECT,
  })
  return rows.map(rowToDto)
}

export async function getPlanFilterOptions(): Promise<PlanFilterOptions> {
  const [providers, regions] = await Promise.all([
    prisma.esimProvider.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } }),
    prisma.region.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ])
  return { providers, regions }
}

export async function setPlanActive(id: string, isActive: boolean, actor: AdminActorContext): Promise<AdminPlanDto> {
  const before = await prisma.plan.findFirst({ where: { id, deletedAt: null }, select: { isActive: true, name: true } })
  if (!before) throw new AdminError('Plan not found', 404)
  await prisma.plan.update({ where: { id }, data: { isActive } })
  await writeAudit({
    actor, action: isActive ? 'enable' : 'disable', entity: 'Plan', entityId: id,
    before: { isActive: before.isActive }, after: { isActive },
  })
  return loadDto(id)
}

/**
 * Dry-run readiness check ahead of a provider catalog sync. Contacts no
 * external provider (live sync is Phase 4H); reports current state so the
 * operator can confirm before a real sync is enabled, and audits the intent.
 */
export async function prepareProviderSync(providerId: string, actor: AdminActorContext): Promise<SyncPreparationDto> {
  const provider = await prisma.esimProvider.findFirst({
    where: { id: providerId, deletedAt: null },
    select: { id: true, slug: true, name: true, status: true, lastSyncedAt: true },
  })
  if (!provider) throw new AdminError('Provider not found', 404)

  const [totalPlans, activePlans] = await Promise.all([
    prisma.plan.count({ where: { providerId, deletedAt: null } }),
    prisma.plan.count({ where: { providerId, deletedAt: null, isActive: true } }),
  ])

  const ready = provider.status === ProviderStatus.ACTIVE
  const message = ready
    ? `Provider "${provider.name}" is active and ready. ${totalPlans} plans on file (${activePlans} active). Live sync lands in Phase 4H.`
    : `Provider "${provider.name}" is ${provider.status}. Enable it before a sync can run.`

  await writeAudit({
    actor, action: 'sync_prepare', entity: 'EsimProvider', entityId: providerId,
    before: null, after: { ready, totalPlans, activePlans },
  })

  return {
    providerId: provider.id,
    providerSlug: provider.slug,
    providerName: provider.name,
    providerStatus: provider.status,
    ready,
    totalPlans,
    activePlans,
    lastSyncedAt: provider.lastSyncedAt?.toISOString() ?? null,
    message,
  }
}

async function loadDto(id: string): Promise<AdminPlanDto> {
  const p = await prisma.plan.findUnique({ where: { id }, select: LIST_SELECT })
  if (!p) throw new AdminError('Plan not found', 404)
  return rowToDto(p)
}
