import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminReplyToTicket } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { body?: unknown }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params

  let raw: Body
  try { raw = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof raw.body !== 'string') return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const meta = actorMeta(req, guard.session)
  try {
    const message = await adminReplyToTicket(id, raw.body, {
      actorId: guard.session.user.id as string,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    if (!message) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    return NextResponse.json({ message }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
