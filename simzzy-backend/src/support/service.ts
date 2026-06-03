import { ActorType, TicketPriority, TicketStatus } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Customer-facing support service.
 *
 * Mirrors the storefront ticket flow:
 *   - Open a ticket with a category, subject, and first message body.
 *   - List my open + closed tickets.
 *   - View one ticket I own, including the full message thread.
 *
 * Admin reply/assign flows are out of scope here — they live in `src/admin/*`
 * (Phase 4G).
 */

/** Stored as a tag in `subject` (e.g. `[ORDER_ISSUE] My eSIM …`) since the
 *  schema has no dedicated category column. Keep these literals stable —
 *  the storefront filters on them. */
export const TICKET_CATEGORIES = ['ORDER_ISSUE', 'ACTIVATION_ISSUE', 'PAYMENT_ISSUE', 'GENERAL'] as const
export type TicketCategory = typeof TICKET_CATEGORIES[number]

const CATEGORY_PRIORITY: Record<TicketCategory, TicketPriority> = {
  ORDER_ISSUE: TicketPriority.HIGH,
  ACTIVATION_ISSUE: TicketPriority.HIGH,
  PAYMENT_ISSUE: TicketPriority.URGENT,
  GENERAL: TicketPriority.MEDIUM,
}

const CATEGORY_TAG_RE = /^\[(ORDER_ISSUE|ACTIVATION_ISSUE|PAYMENT_ISSUE|GENERAL)\]\s+/

export type TicketSummaryDto = {
  id: string
  category: TicketCategory
  subject: string
  status: TicketStatus
  priority: TicketPriority
  orderId: string | null
  createdAt: string
  updatedAt: string
  messageCount: number
}

export type TicketMessageDto = {
  id: string
  body: string
  authorType: ActorType
  authorName: string | null
  createdAt: string
}

export type TicketDetailDto = TicketSummaryDto & {
  messages: TicketMessageDto[]
}

export type CreateTicketInput = {
  category: TicketCategory
  subject: string
  body: string
  orderId?: string | null
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function splitCategory(subject: string): { category: TicketCategory; bareSubject: string } {
  const m = subject.match(CATEGORY_TAG_RE)
  if (m) {
    return { category: m[1] as TicketCategory, bareSubject: subject.replace(CATEGORY_TAG_RE, '') }
  }
  return { category: 'GENERAL', bareSubject: subject }
}

function summarise(row: {
  id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  orderId: string | null
  createdAt: Date
  updatedAt: Date
  _count: { messages: number }
}): TicketSummaryDto {
  const { category, bareSubject } = splitCategory(row.subject)
  return {
    id: row.id,
    category,
    subject: bareSubject,
    status: row.status,
    priority: row.priority,
    orderId: row.orderId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messageCount: row._count.messages,
  }
}

/* ─── Public service ────────────────────────────────────────────────────── */

export async function createTicket(
  userId: string,
  input: CreateTicketInput,
): Promise<TicketDetailDto> {
  if (!TICKET_CATEGORIES.includes(input.category)) {
    throw new Error(`Unknown ticket category: ${input.category}`)
  }
  const subject = input.subject?.trim()
  const body = input.body?.trim()
  if (!subject || subject.length < 3 || subject.length > 200) {
    throw new Error('Subject must be 3–200 characters')
  }
  if (!body || body.length < 5 || body.length > 5000) {
    throw new Error('Message body must be 5–5000 characters')
  }

  // If orderId provided, make sure it belongs to this user (no cross-account linking).
  let orderId: string | null = null
  if (input.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!order) throw new Error('Order not found or does not belong to this user')
    orderId = order.id
  }

  const taggedSubject = `[${input.category}] ${subject}`

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      orderId,
      subject: taggedSubject,
      priority: CATEGORY_PRIORITY[input.category],
      status: TicketStatus.OPEN,
      messages: {
        create: {
          authorId: userId,
          authorType: ActorType.USER,
          body,
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true, email: true } } },
      },
      _count: { select: { messages: true } },
    },
  })

  return {
    ...summarise(ticket),
    messages: ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorType: m.authorType,
      authorName: m.author?.name ?? m.author?.email ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

export async function listMyTickets(
  userId: string,
  opts: { status?: TicketStatus; limit?: number } = {},
): Promise<TicketSummaryDto[]> {
  const rows = await prisma.supportTicket.findMany({
    where: {
      userId,
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(200, Math.max(1, opts.limit ?? 50)),
    select: {
      id: true,
      subject: true,
      status: true,
      priority: true,
      orderId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })
  return rows.map(summarise)
}

export async function getMyTicket(
  userId: string,
  ticketId: string,
): Promise<TicketDetailDto | null> {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId }, // ownership enforced at the WHERE clause
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true, email: true } } },
      },
      _count: { select: { messages: true } },
    },
  })
  if (!ticket) return null
  return {
    ...summarise(ticket),
    messages: ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorType: m.authorType,
      authorName: m.author?.name ?? m.author?.email ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

export async function addMyTicketMessage(
  userId: string,
  ticketId: string,
  body: string,
): Promise<TicketMessageDto | null> {
  const trimmed = body?.trim()
  if (!trimmed || trimmed.length < 1 || trimmed.length > 5000) {
    throw new Error('Message body must be 1–5000 characters')
  }
  // Confirm ticket ownership before letting the user post into it.
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    select: { id: true, status: true },
  })
  if (!ticket) return null
  if (ticket.status === TicketStatus.CLOSED) {
    throw new Error('Ticket is closed — open a new one to continue')
  }
  const message = await prisma.supportMessage.create({
    data: {
      ticketId,
      authorId: userId,
      authorType: ActorType.USER,
      body: trimmed,
    },
    include: { author: { select: { name: true, email: true } } },
  })
  // Bump updatedAt and re-open if admin had set it RESOLVED.
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: ticket.status === TicketStatus.RESOLVED ? TicketStatus.OPEN : ticket.status },
  })
  return {
    id: message.id,
    body: message.body,
    authorType: message.authorType,
    authorName: message.author?.name ?? message.author?.email ?? null,
    createdAt: message.createdAt.toISOString(),
  }
}
