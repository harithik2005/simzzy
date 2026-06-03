import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { TicketStatus } from '@prisma/client'
import { setTicketStatus } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { status?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params

  let raw: Body
  try { raw = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof raw.status !== 'string' || !(Object.values(TicketStatus) as string[]).includes(raw.status)) {
    return NextResponse.json({ error: 'status must be OPEN, IN_PROGRESS, RESOLVED, or CLOSED' }, { status: 400 })
  }

  const meta = actorMeta(req, guard.session)
  const ticket = await setTicketStatus(id, raw.status as TicketStatus, {
    actorId: guard.session.user.id as string,
    ip: meta.ip,
    userAgent: meta.userAgent,
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  return NextResponse.json({ ticket })
}
