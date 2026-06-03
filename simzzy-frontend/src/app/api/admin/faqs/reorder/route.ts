import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { reorderFaqs } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { category?: unknown; orderedIds?: unknown }

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.category !== 'string' || !body.category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }
  if (!Array.isArray(body.orderedIds) || !body.orderedIds.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'orderedIds must be an array of strings' }, { status: 400 })
  }

  try {
    const faqs = await reorderFaqs(body.category, body.orderedIds as string[], actorMeta(req, guard.session))
    return NextResponse.json({ faqs })
  } catch (e) {
    return adminErrorResponse(e, '[PUT /api/admin/faqs/reorder]')
  }
}
