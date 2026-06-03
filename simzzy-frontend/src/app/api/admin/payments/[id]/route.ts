import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPaymentDetail } from 'simzzy-backend'
import { adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  try {
    const payment = await getPaymentDetail(id)
    return NextResponse.json({ payment })
  } catch (e) {
    return adminErrorResponse(e, `[GET /api/admin/payments/${id}]`)
  }
}
