import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ReviewStatus, setReviewStatus } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { status?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.status !== 'string' || !(Object.values(ReviewStatus) as string[]).includes(body.status)) {
    return NextResponse.json({ error: 'status must be PENDING, APPROVED or REJECTED' }, { status: 400 })
  }

  try {
    const review = await setReviewStatus(id, body.status as ReviewStatus, actorMeta(req, guard.session))
    return NextResponse.json({ review })
  } catch (e) {
    return adminErrorResponse(e, `[PUT /api/admin/reviews/${id}/status]`)
  }
}
