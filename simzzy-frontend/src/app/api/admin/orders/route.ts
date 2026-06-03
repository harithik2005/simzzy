import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listOrders, type OrderListFilters } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = [
  'PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'ORDER_SUBMITTED',
  'QR_PENDING', 'QR_RECEIVED', 'DELIVERED', 'ACTIVATED',
  'FAILED', 'CANCELLED', 'REFUNDED',
] as const

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: OrderListFilters = {}

  const status = sp.get('status')
  if (status && (ALLOWED_STATUSES as readonly string[]).includes(status)) {
    filters.status = status as OrderListFilters['status']
  }

  const dateFrom = sp.get('dateFrom'); if (dateFrom) filters.dateFrom = dateFrom
  const dateTo = sp.get('dateTo'); if (dateTo) filters.dateTo = dateTo

  const q = sp.get('q'); if (q) filters.q = q
  const country = sp.get('country'); if (country) filters.country = country

  const limit = Number(sp.get('limit')) || 100

  try {
    const orders = await listOrders(filters, limit)
    return NextResponse.json({ orders, total: orders.length })
  } catch (e) {
    console.error('[GET /api/admin/orders]', e)
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 })
  }
}
