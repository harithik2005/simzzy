import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getMyOrderDetail } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Customer-scoped order detail. Returns the full DTO: order summary + items +
 * timeline + payments (no admin/internal fields). Ownership is enforced inside
 * `getMyOrderDetail` — non-owners get null → 404.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const { id } = await ctx.params
  const order = await getMyOrderDetail(userId, id)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ order })
}
