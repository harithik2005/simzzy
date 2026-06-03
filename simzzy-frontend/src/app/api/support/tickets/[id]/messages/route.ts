import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { addMyTicketMessage } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { body?: unknown }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const { id } = await ctx.params

  let raw: Body
  try { raw = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof raw.body !== 'string') return NextResponse.json({ error: 'body is required' }, { status: 400 })

  try {
    const message = await addMyTicketMessage(userId, id, raw.body)
    if (!message) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    return NextResponse.json({ message }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
