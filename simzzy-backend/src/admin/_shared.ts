import { ActorType, Prisma } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Shared admin helpers — one audit-writer + one actor type, reused by every
 * admin operations service (faqs, plans, payments, reviews, settings, …) so
 * there is a single audit path and no per-file duplication.
 *
 * Entity is a free-form string here (unlike the pricing module's typed
 * `logPricingChange`) because the admin surface spans many models. Every
 * mutation in `src/admin/*` should call `writeAudit` so the Audit Center shows
 * a complete who/what/when trail.
 */

export type AdminActorContext = {
  actorId: string | null
  ip?: string | null
  userAgent?: string | null
}

export async function writeAudit(args: {
  actor: AdminActorContext
  action: string
  entity: string
  entityId: string | null
  before: Prisma.InputJsonValue | null
  after: Prisma.InputJsonValue | null
}): Promise<void> {
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

/** Thrown by admin services for caller-fixable problems (404 / bad input / RBAC). */
export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 400,
  ) {
    super(message)
    this.name = 'AdminError'
  }
}
