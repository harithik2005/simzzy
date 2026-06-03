import type { Prisma } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Generic admin audit log reader.
 *
 * Pricing module already has its own `listPricingAuditLog`; this one is the
 * cross-entity view powering the Admin Audit Center page. Filterable by:
 *   • entity (User, PricingGlobalRule, EsimProvider, Order, …)
 *   • actor (user id or email substring)
 *   • date range
 */

export type AuditLogEntryDto = {
  id: string
  createdAt: string
  action: string
  entity: string
  entityId: string | null
  actor: { id: string; name: string | null; email: string } | null
  actorType: string
  before: unknown
  after: unknown
  ip: string | null
}

export type AuditFilters = {
  entity?: string
  actorId?: string
  actorQuery?: string  // substring of name/email
  dateFrom?: string
  dateTo?: string
}

export async function listAuditLog(filters: AuditFilters = {}, limit = 100): Promise<AuditLogEntryDto[]> {
  const where: Prisma.AuditLogWhereInput = {}
  const ands: Prisma.AuditLogWhereInput[] = []

  if (filters.entity) ands.push({ entity: filters.entity })
  if (filters.actorId) ands.push({ actorId: filters.actorId })
  if (filters.actorQuery && filters.actorQuery.trim()) {
    const q = filters.actorQuery.trim()
    ands.push({
      actor: {
        is: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name:  { contains: q, mode: 'insensitive' } },
          ],
        },
      },
    })
  }
  if (filters.dateFrom) {
    const d = new Date(filters.dateFrom)
    if (!isNaN(d.getTime())) ands.push({ createdAt: { gte: d } })
  }
  if (filters.dateTo) {
    const d = new Date(filters.dateTo)
    if (!isNaN(d.getTime())) {
      d.setUTCHours(23, 59, 59, 999)
      ands.push({ createdAt: { lte: d } })
    }
  }
  if (ands.length) where.AND = ands

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Math.max(1, limit)),
    select: {
      id: true,
      createdAt: true,
      action: true,
      entity: true,
      entityId: true,
      actorType: true,
      before: true,
      after: true,
      ip: true,
      actor: { select: { id: true, name: true, email: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    actorType: r.actorType,
    actor: r.actor ? { id: r.actor.id, name: r.actor.name, email: r.actor.email } : null,
    before: r.before,
    after: r.after,
    ip: r.ip,
  }))
}

/** Distinct entity types present in the log — for the filter dropdown. */
export async function listAuditEntities(): Promise<string[]> {
  const rows = await prisma.auditLog.groupBy({
    by: ['entity'],
    orderBy: { entity: 'asc' },
  })
  return rows.map((r) => r.entity)
}
