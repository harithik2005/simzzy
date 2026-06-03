import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteReview } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  try {
    await deleteReview(id, actorMeta(req, guard.session))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminErrorResponse(e, `[DELETE /api/admin/reviews/${id}]`)
  }
}
