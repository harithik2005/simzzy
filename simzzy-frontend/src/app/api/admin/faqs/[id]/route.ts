import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteFaq, updateFaq } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { category?: unknown; question?: unknown; answer?: unknown; isPublished?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  try {
    const faq = await updateFaq(
      id,
      {
        category: String(body.category ?? ''),
        question: String(body.question ?? ''),
        answer: String(body.answer ?? ''),
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
      },
      actorMeta(req, guard.session),
    )
    return NextResponse.json({ faq })
  } catch (e) {
    return adminErrorResponse(e, `[PUT /api/admin/faqs/${id}]`)
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  try {
    await deleteFaq(id, actorMeta(req, guard.session))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminErrorResponse(e, `[DELETE /api/admin/faqs/${id}]`)
  }
}
