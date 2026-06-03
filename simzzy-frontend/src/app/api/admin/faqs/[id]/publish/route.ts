import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { setFaqPublished } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { isPublished?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.isPublished !== 'boolean') {
    return NextResponse.json({ error: 'isPublished must be a boolean' }, { status: 400 })
  }

  try {
    const faq = await setFaqPublished(id, body.isPublished, actorMeta(req, guard.session))
    return NextResponse.json({ faq })
  } catch (e) {
    return adminErrorResponse(e, `[PUT /api/admin/faqs/${id}/publish]`)
  }
}
