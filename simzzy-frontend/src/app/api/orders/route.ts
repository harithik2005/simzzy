import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  createOrder,
  OrderNotFoundError,
  OrderValidationError,
  type CreateOrderInput,
} from 'simzzy-backend'
import { actorMeta, requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  planSlug?: unknown
  customerEmail?: unknown
  customerName?: unknown
  customerPhone?: unknown
  currency?: unknown
  discountUsd?: unknown
  quantity?: unknown
}

export async function POST(req: NextRequest) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const input: CreateOrderInput = {
    planSlug: typeof body.planSlug === 'string' ? body.planSlug : '',
    customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : '',
    customerName: typeof body.customerName === 'string' ? body.customerName : null,
    customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone : null,
    currency: typeof body.currency === 'string' ? body.currency : 'USD',
    discountUsd: typeof body.discountUsd === 'number' && Number.isFinite(body.discountUsd) ? body.discountUsd : 0,
    quantity: typeof body.quantity === 'number' && Number.isFinite(body.quantity) ? body.quantity : 1,
  }

  const meta = actorMeta(req, guard.session)

  try {
    const order = await createOrder(userId, input, { actorId: userId, ip: meta.ip, userAgent: meta.userAgent })
    return NextResponse.json({ order }, { status: 201 })
  } catch (e) {
    if (e instanceof OrderValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    if (e instanceof OrderNotFoundError)   return NextResponse.json({ error: e.message }, { status: 404 })
    console.error('[POST /api/orders]', e)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
