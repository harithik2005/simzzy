import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ActorType } from '@prisma/client'
import { addOrderInternalNote, OrderNotFoundError, OrderValidationError } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { body?: unknown }

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  let raw: Body
  try { raw = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof raw.body !== 'string') return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const meta = actorMeta(req, guard.session)
  try {
    await addOrderInternalNote(id, raw.body, {
      actorId: guard.session.user.id as string,
      actorType: ActorType.ADMIN,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    if (e instanceof OrderValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
    if (e instanceof OrderNotFoundError)   return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    console.error(`[POST /api/admin/orders/${id}/note]`, e)
    return NextResponse.json({ error: 'Failed to add internal note' }, { status: 500 })
  }
}
