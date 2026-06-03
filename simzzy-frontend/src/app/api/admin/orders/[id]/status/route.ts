import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ActorType } from '@prisma/client'
import {
  transitionStatus,
  IllegalTransitionError,
  OrderNotFoundError,
  type PublicStatus,
} from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = new Set([
  'PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'ORDER_SUBMITTED',
  'QR_PENDING', 'QR_RECEIVED', 'DELIVERED', 'ACTIVATED',
  'FAILED', 'CANCELLED', 'REFUNDED',
])

type Body = { toStatus?: unknown; reason?: unknown }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  if (typeof body.toStatus !== 'string' || !ALLOWED.has(body.toStatus)) {
    return NextResponse.json({ error: 'toStatus is required' }, { status: 400 })
  }

  const meta = actorMeta(req, guard.session)
  const actorId = guard.session.user.id as string
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Admin transition'

  try {
    const order = await transitionStatus(id, body.toStatus as PublicStatus as never, {
      actorId, actorType: ActorType.ADMIN, ip: meta.ip, userAgent: meta.userAgent, reason,
    })
    return NextResponse.json({ order })
  } catch (e) {
    if (e instanceof IllegalTransitionError) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    if (e instanceof OrderNotFoundError) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    console.error(`[POST /api/admin/orders/${id}/status]`, e)
    return NextResponse.json({ error: 'Failed to transition order' }, { status: 500 })
  }
}
