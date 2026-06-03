import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getReviewStats, listReviews, type AdminReviewStatusFilter, type ReviewFilters } from 'simzzy-backend'
import { adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS_VALUES: AdminReviewStatusFilter[] = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'all']

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: ReviewFilters = {}
  const q = sp.get('q'); if (q) filters.q = q
  const status = sp.get('status')
  if (status && (STATUS_VALUES as string[]).includes(status)) {
    filters.status = status as AdminReviewStatusFilter
  }

  try {
    const [reviews, stats] = await Promise.all([listReviews(filters), getReviewStats()])
    return NextResponse.json({ reviews, stats })
  } catch (e) {
    return adminErrorResponse(e, '[GET /api/admin/reviews]')
  }
}
