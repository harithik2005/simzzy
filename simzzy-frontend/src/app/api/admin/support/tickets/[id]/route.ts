import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminTicket } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  const ticket = await getAdminTicket(id)
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  return NextResponse.json({ ticket })
}
