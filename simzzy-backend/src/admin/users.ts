import { ActorType, Prisma, Role, UserStatus } from '@prisma/client'
import { prisma } from '../../client'
import { logPricingChange } from '../pricing/audit'

/**
 * Admin user management.
 *
 * RBAC rules enforced here (server-side, never trust the caller's role flag):
 *   • ADMIN may suspend/activate USERs, view all users.
 *   • Only SUPER_ADMIN may promote/demote ADMIN ⇄ SUPER_ADMIN.
 *   • No one (not even SUPER_ADMIN) may demote *themselves* — guards against
 *     locking the last super-admin out.
 *
 * Every status / role mutation writes to `audit_logs` via a generic helper —
 * we reuse the pricing audit infrastructure so there's only one audit path.
 */

export class ForbiddenError extends Error { readonly code = 'FORBIDDEN' as const }

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  _count: { select: { orders: true, ticketsOpened: true } },
} satisfies Prisma.UserSelect

export type AdminUserListItem = {
  id: string
  email: string
  name: string | null
  role: Role
  status: UserStatus
  createdAt: string
  lastLoginAt: string | null
  orderCount: number
  ticketCount: number
}

export type AdminUserDetail = AdminUserListItem & {
  phone: string | null
  countryCode: string | null
  timezone: string | null
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    usdTotal: number
    createdAt: string
  }>
  recentTickets: Array<{
    id: string
    subject: string
    status: string
    updatedAt: string
  }>
}

export type ListUsersFilters = {
  q?: string
  status?: UserStatus
  role?: Role
}

function rowToItem(u: {
  id: string; email: string; name: string | null; role: Role; status: UserStatus
  createdAt: Date; lastLoginAt: Date | null
  _count: { orders: number; ticketsOpened: number }
}): AdminUserListItem {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role, status: u.status,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    orderCount: u._count.orders,
    ticketCount: u._count.ticketsOpened,
  }
}

export async function listUsers(filters: ListUsersFilters = {}, limit = 200): Promise<AdminUserListItem[]> {
  const where: Prisma.UserWhereInput = { deletedAt: null }
  const ands: Prisma.UserWhereInput[] = []
  if (filters.status) ands.push({ status: filters.status })
  if (filters.role) ands.push({ role: filters.role })
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    })
  }
  if (ands.length) where.AND = ands

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(500, Math.max(1, limit)),
    select: USER_LIST_SELECT,
  })
  return rows.map(rowToItem)
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_LIST_SELECT,
      phone: true,
      countryCode: true,
      timezone: true,
      orders: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, status: true, usdTotal: true, createdAt: true },
      },
      ticketsOpened: {
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, subject: true, status: true, updatedAt: true },
      },
    },
  })
  if (!u) return null
  return {
    ...rowToItem(u),
    phone: u.phone,
    countryCode: u.countryCode,
    timezone: u.timezone,
    recentOrders: u.orders.map((o) => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status,
      usdTotal: Number(o.usdTotal),
      createdAt: o.createdAt.toISOString(),
    })),
    recentTickets: u.ticketsOpened.map((t) => ({
      id: t.id, subject: t.subject, status: t.status,
      updatedAt: t.updatedAt.toISOString(),
    })),
  }
}

/* ─── Mutations ─────────────────────────────────────────────────────────── */

export type ActorContext = {
  actorId: string | null
  actorRole: Role | null
  ip?: string | null
  userAgent?: string | null
}

async function logUserAudit(args: {
  actor: ActorContext
  action: 'update' | 'suspend' | 'activate' | 'role_change' | 'delete'
  targetUserId: string
  before: Prisma.InputJsonValue | null
  after: Prisma.InputJsonValue | null
}) {
  await prisma.auditLog.create({
    data: {
      actorId: args.actor.actorId,
      actorType: args.actor.actorId ? ActorType.ADMIN : ActorType.SYSTEM,
      action: args.action,
      entity: 'User',
      entityId: args.targetUserId,
      before: args.before ?? Prisma.JsonNull,
      after: args.after ?? Prisma.JsonNull,
      ip: args.actor.ip ?? null,
      userAgent: args.actor.userAgent ?? null,
    },
  })
}

export async function setUserStatus(
  targetUserId: string,
  status: UserStatus,
  actor: ActorContext,
): Promise<AdminUserListItem> {
  if (actor.actorId === targetUserId) {
    throw new ForbiddenError('You cannot change your own status')
  }
  const before = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { status: true, role: true },
  })
  if (!before) throw new ForbiddenError('User not found')

  // Only SUPER_ADMIN can suspend another admin or super-admin.
  if (before.role !== Role.USER && actor.actorRole !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Only a SUPER_ADMIN can change the status of an admin')
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { status } })
  await logUserAudit({
    actor,
    action: status === UserStatus.SUSPENDED ? 'suspend' : 'activate',
    targetUserId,
    before: { status: before.status },
    after: { status },
  })

  const detail = await prisma.user.findUnique({ where: { id: targetUserId }, select: USER_LIST_SELECT })
  if (!detail) throw new Error('User vanished mid-update')
  return rowToItem(detail)
}

export async function setUserRole(
  targetUserId: string,
  role: Role,
  actor: ActorContext,
): Promise<AdminUserListItem> {
  // ANY role change requires SUPER_ADMIN.
  if (actor.actorRole !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('Only a SUPER_ADMIN can change roles')
  }
  if (actor.actorId === targetUserId && role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError('You cannot demote yourself — ask another SUPER_ADMIN')
  }
  // If we're demoting the last SUPER_ADMIN, refuse — guards against lockout.
  if (role !== Role.SUPER_ADMIN) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } })
    if (target?.role === Role.SUPER_ADMIN) {
      const remaining = await prisma.user.count({
        where: { role: Role.SUPER_ADMIN, deletedAt: null, NOT: { id: targetUserId } },
      })
      if (remaining === 0) throw new ForbiddenError('Cannot remove the last SUPER_ADMIN')
    }
  }

  const before = await prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } })
  if (!before) throw new ForbiddenError('User not found')

  await prisma.user.update({ where: { id: targetUserId }, data: { role } })
  await logUserAudit({
    actor,
    action: 'role_change',
    targetUserId,
    before: { role: before.role },
    after: { role },
  })

  const detail = await prisma.user.findUnique({ where: { id: targetUserId }, select: USER_LIST_SELECT })
  if (!detail) throw new Error('User vanished mid-update')
  return rowToItem(detail)
}

// Reuse pricing audit's general writer for callers that prefer the shorter
// signature (e.g. middleware). Re-exported for completeness.
export { logPricingChange as logGenericAudit }
