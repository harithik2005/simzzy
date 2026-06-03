import { ActorType, Prisma } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Pricing audit log. Backed by the shared `audit_logs` table — every pricing
 * mutation writes a row here with a structured `before`/`after` snapshot so
 * admins can answer "who changed the Japan rule and when?".
 */

export const PRICING_ENTITIES = {
  GLOBAL:   'PricingGlobalRule',
  COUNTRY:  'PricingCountryRule',
  DURATION: 'PricingDurationRule',
  OVERRIDE: 'PlanPriceOverride',
} as const
export type PricingEntity = typeof PRICING_ENTITIES[keyof typeof PRICING_ENTITIES]

export const PRICING_ACTIONS = {
  UPDATE: 'update',
  CREATE: 'create',
  DELETE: 'delete',
} as const
export type PricingAction = typeof PRICING_ACTIONS[keyof typeof PRICING_ACTIONS]

export type LogPricingChangeArgs = {
  actorId: string | null
  action: PricingAction
  entity: PricingEntity
  entityId: string | null
  before: Prisma.InputJsonValue | null
  after: Prisma.InputJsonValue | null
  ip?: string | null
  userAgent?: string | null
}

export async function logPricingChange(args: LogPricingChangeArgs): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: args.actorId,
      actorType: args.actorId ? ActorType.ADMIN : ActorType.SYSTEM,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      before: args.before ?? Prisma.JsonNull,
      after: args.after ?? Prisma.JsonNull,
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    },
  })
}

/* ─── Listing ───────────────────────────────────────────────────────────── */

export type PricingAuditEntry = {
  id: string
  createdAt: string
  actor: { id: string; name: string | null; email: string } | null
  action: string
  entity: string
  entityId: string | null
  before: unknown
  after: unknown
}

export async function listPricingAuditLog(limit = 50): Promise<PricingAuditEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entity: { in: Object.values(PRICING_ENTITIES) } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, Math.max(1, limit)),
    select: {
      id: true,
      createdAt: true,
      action: true,
      entity: true,
      entityId: true,
      before: true,
      after: true,
      actor: { select: { id: true, name: true, email: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    actor: r.actor ? { id: r.actor.id, name: r.actor.name, email: r.actor.email } : null,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    before: r.before,
    after: r.after,
  }))
}
