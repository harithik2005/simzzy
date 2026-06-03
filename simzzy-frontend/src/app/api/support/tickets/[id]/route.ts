import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getMyTicket } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const { id } = await ctx.params
  const ticket = await getMyTicket(userId, id)
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  return NextResponse.json({ ticket })
}
