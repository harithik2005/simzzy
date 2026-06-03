import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { TicketStatus } from '@prisma/client'
import { listAdminTickets, type TicketFilters } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: TicketFilters = {}
  const status = sp.get('status')
  if (status && (Object.values(TicketStatus) as string[]).includes(status)) {
    filters.status = status as TicketStatus
  }
  const q = sp.get('q'); if (q) filters.q = q
  const priority = sp.get('priority'); if (priority) filters.priority = priority

  try {
    const tickets = await listAdminTickets(filters, Number(sp.get('limit')) || 200)
    return NextResponse.json({ tickets })
  } catch (e) {
    console.error('[GET /api/admin/support/tickets]', e)
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }
}
