import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  TICKET_CATEGORIES,
  createTicket,
  listMyTickets,
  type TicketCategory,
} from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const tickets = await listMyTickets(userId, { limit: 100 })
  return NextResponse.json({ tickets })
}

type Body = {
  category?: unknown
  subject?: unknown
  body?: unknown
  orderId?: unknown
}

export async function POST(req: NextRequest) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  let raw: Body
  try { raw = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const category = typeof raw.category === 'string' ? raw.category : ''
  if (!(TICKET_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (typeof raw.subject !== 'string') return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  if (typeof raw.body !== 'string') return NextResponse.json({ error: 'body is required' }, { status: 400 })

  try {
    const ticket = await createTicket(userId, {
      category: category as TicketCategory,
      subject: raw.subject,
      body: raw.body,
      orderId: typeof raw.orderId === 'string' ? raw.orderId : null,
    })
    return NextResponse.json({ ticket }, { status: 201 })
  } catch (e) {
    const msg = (e as Error).message ?? 'Failed to create ticket'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
