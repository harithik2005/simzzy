import { ActorType, Prisma, ProviderStatus } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Provider operations — admin can list/enable/disable both eSIM and payment
 * providers. Credentials live in environment variables / secret manager keyed
 * by `credentialRef` — those are NEVER exposed by this service, only the
 * reference string.
 *
 * Live tSIM ordering and EximPe wiring is Phase 4H. This module deliberately
 * stops at "I can flip the provider on/off" + read last-sync metadata.
 */

export type EsimProviderDto = {
  id: string
  slug: string
  name: string
  status: ProviderStatus
  credentialRef: string | null
  lastSyncedAt: string | null
  activePlanCount: number
  totalPlanCount: number
  lastSyncStatus: string | null
  errorCount: number // count of sync logs in FAILURE state
}

export type PaymentProviderDto = {
  id: string
  slug: string
  name: string
  status: ProviderStatus
  isDefault: boolean
  credentialRef: string | null
  successfulPayments: number
  failedPayments: number
}

export async function listEsimProviders(): Promise<EsimProviderDto[]> {
  const rows = await prisma.esimProvider.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          plans: { where: { isActive: true, deletedAt: null } },
        },
      },
    },
  })

  const result: EsimProviderDto[] = []
  for (const p of rows) {
    const totalPlans = await prisma.plan.count({ where: { providerId: p.id, deletedAt: null } })
    const lastLog = await prisma.planSyncLog.findFirst({
      where: { providerId: p.id },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    })
    const failedLogs = await prisma.planSyncLog.count({
      where: { providerId: p.id, status: 'FAILED' as never },
    })
    result.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      credentialRef: p.credentialRef,
      lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
      activePlanCount: p._count.plans,
      totalPlanCount: totalPlans,
      lastSyncStatus: lastLog?.status ?? null,
      errorCount: failedLogs,
    })
  }
  return result
}

export async function listPaymentProviders(): Promise<PaymentProviderDto[]> {
  const rows = await prisma.paymentProvider.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  const result: PaymentProviderDto[] = []
  for (const p of rows) {
    const ok = await prisma.payment.count({ where: { providerId: p.id, status: 'SUCCESS' as never } })
    const failed = await prisma.payment.count({ where: { providerId: p.id, status: 'FAILED' as never } })
    result.push({
      id: p.id, slug: p.slug, name: p.name, status: p.status,
      isDefault: p.isDefault, credentialRef: p.credentialRef,
      successfulPayments: ok, failedPayments: failed,
    })
  }
  return result
}

export type ActorContext = {
  actorId: string | null
  ip?: string | null
  userAgent?: string | null
}

async function logProviderAudit(args: {
  entity: 'EsimProvider' | 'PaymentProvider'
  entityId: string
  action: 'enable' | 'disable'
  before: Prisma.InputJsonValue | null
  after: Prisma.InputJsonValue | null
  actor: ActorContext
}) {
  await prisma.auditLog.create({
    data: {
      actorId: args.actor.actorId,
      actorType: args.actor.actorId ? ActorType.ADMIN : ActorType.SYSTEM,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      before: args.before ?? Prisma.JsonNull,
      after: args.after ?? Prisma.JsonNull,
      ip: args.actor.ip ?? null,
      userAgent: args.actor.userAgent ?? null,
    },
  })
}

export async function setEsimProviderStatus(id: string, status: ProviderStatus, actor: ActorContext) {
  const before = await prisma.esimProvider.findUnique({ where: { id }, select: { status: true, slug: true } })
  if (!before) return null
  await prisma.esimProvider.update({ where: { id }, data: { status } })
  await logProviderAudit({
    entity: 'EsimProvider',
    entityId: id,
    action: status === ProviderStatus.ACTIVE ? 'enable' : 'disable',
    before: { status: before.status, slug: before.slug },
    after: { status, slug: before.slug },
    actor,
  })
  return prisma.esimProvider.findUnique({ where: { id } })
}

export async function setPaymentProviderStatus(id: string, status: ProviderStatus, actor: ActorContext) {
  const before = await prisma.paymentProvider.findUnique({ where: { id }, select: { status: true, slug: true } })
  if (!before) return null
  await prisma.paymentProvider.update({ where: { id }, data: { status } })
  await logProviderAudit({
    entity: 'PaymentProvider',
    entityId: id,
    action: status === ProviderStatus.ACTIVE ? 'enable' : 'disable',
    before: { status: before.status, slug: before.slug },
    after: { status, slug: before.slug },
    actor,
  })
  return prisma.paymentProvider.findUnique({ where: { id } })
}
