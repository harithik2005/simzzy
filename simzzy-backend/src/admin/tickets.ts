import { ActorType, Prisma, TicketStatus } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Admin ticket queue.
 *
 * The customer-facing support service (`src/support/service.ts`) is read-only
 * for non-owners; this module is the admin counterpart that can see + reply
 * to every ticket and transition status.
 */

export type AdminTicketSummary = {
  id: string
  subject: string
  status: TicketStatus
  priority: string
  customer: { id: string; name: string | null; email: string } | null
  orderId: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

export type AdminTicketDetail = AdminTicketSummary & {
  messages: Array<{
    id: string
    body: string
    authorType: string
    authorName: string | null
    createdAt: string
  }>
  assignedAdminId: string | null
}

export type TicketFilters = {
  status?: TicketStatus
  q?: string
  priority?: string
}

const SUMMARY_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude

function toSummary(t: Prisma.SupportTicketGetPayload<{ include: typeof SUMMARY_INCLUDE }>): AdminTicketSummary {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    customer: t.user,
    orderId: t.orderId,
    messageCount: t._count.messages,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

export async function listAdminTickets(filters: TicketFilters = {}, limit = 200): Promise<AdminTicketSummary[]> {
  const where: Prisma.SupportTicketWhereInput = {}
  const ands: Prisma.SupportTicketWhereInput[] = []
  if (filters.status) ands.push({ status: filters.status })
  if (filters.priority) ands.push({ priority: filters.priority as Prisma.SupportTicketWhereInput['priority'] })
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { subject: { contains: q, mode: 'insensitive' } },
        { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }
  if (ands.length) where.AND = ands

  const rows = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: Math.min(500, Math.max(1, limit)),
    include: SUMMARY_INCLUDE,
  })
  return rows.map(toSummary)
}

export async function getAdminTicket(id: string): Promise<AdminTicketDetail | null> {
  const t = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      ...SUMMARY_INCLUDE,
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true, email: true } } },
      },
    },
  })
  if (!t) return null
  return {
    ...toSummary(t),
    assignedAdminId: t.assignedAdminId,
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorType: m.authorType,
      authorName: m.author?.name ?? m.author?.email ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

export type AdminActor = {
  actorId: string
  ip?: string | null
  userAgent?: string | null
}

async function logTicketAudit(args: {
  actor: AdminActor
  action: string
  ticketId: string
  before: Prisma.InputJsonValue | null
  after: Prisma.InputJsonValue | null
}) {
  await prisma.auditLog.create({
    data: {
      actorId: args.actor.actorId,
      actorType: ActorType.ADMIN,
      action: args.action,
      entity: 'SupportTicket',
      entityId: args.ticketId,
      before: args.before ?? Prisma.JsonNull,
      after: args.after ?? Prisma.JsonNull,
      ip: args.actor.ip ?? null,
      userAgent: args.actor.userAgent ?? null,
    },
  })
}

export async function adminReplyToTicket(ticketId: string, body: string, actor: AdminActor) {
  const trimmed = body?.trim()
  if (!trimmed) throw new Error('Reply body is required')

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) return null

  const message = await prisma.supportMessage.create({
    data: {
      ticketId,
      authorId: actor.actorId,
      authorType: ActorType.ADMIN,
      body: trimmed,
    },
  })

  // Bump the updatedAt; if the customer left it OPEN, mark it IN_PROGRESS so
  // the queue clearly shows "we're handling it".
  const nextStatus = ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: nextStatus, assignedAdminId: actor.actorId },
  })

  await logTicketAudit({
    actor,
    action: 'admin_reply',
    ticketId,
    before: { status: ticket.status },
    after: { status: nextStatus, messageId: message.id },
  })

  return message
}

export async function setTicketStatus(ticketId: string, status: TicketStatus, actor: AdminActor) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, status: true } })
  if (!ticket) return null
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } })
  await logTicketAudit({
    actor,
    action: 'status_change',
    ticketId,
    before: { status: ticket.status },
    after: { status },
  })
  return getAdminTicket(ticketId)
}
