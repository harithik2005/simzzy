import { NextResponse } from 'next/server'
import { listMyOrders } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/account/orders — current user's order history.
 *
 * Returns an empty array until Phase 4F starts persisting orders. The shape is
 * already final so the dashboard's "My Orders" tab can be wired now and won't
 * change when fulfilment lands.
 */
export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const orders = await listMyOrders(userId, 50)
  return NextResponse.json({ orders })
}
