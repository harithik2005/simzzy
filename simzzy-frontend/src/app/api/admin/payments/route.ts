import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PaymentStatus, getPaymentStats, listPayments, type PaymentFilters } from 'simzzy-backend'
import { adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: PaymentFilters = {}
  const q = sp.get('q'); if (q) filters.q = q
  const status = sp.get('status')
  if (status === 'all') filters.status = 'all'
  else if (status && (Object.values(PaymentStatus) as string[]).includes(status)) {
    filters.status = status as PaymentStatus
  }

  try {
    const [payments, stats] = await Promise.all([
      listPayments(filters, Number(sp.get('limit')) || 200),
      getPaymentStats(),
    ])
    return NextResponse.json({ payments, stats })
  } catch (e) {
    return adminErrorResponse(e, '[GET /api/admin/payments]')
  }
}
