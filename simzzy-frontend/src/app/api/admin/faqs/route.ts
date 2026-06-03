import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createFaq, listFaqs, listFaqCategories, type FaqFilters } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: FaqFilters = {}
  const q = sp.get('q'); if (q) filters.q = q
  const category = sp.get('category'); if (category) filters.category = category
  const published = sp.get('published')
  if (published === 'true') filters.published = true
  else if (published === 'false') filters.published = false

  try {
    const [faqs, categories] = await Promise.all([listFaqs(filters), listFaqCategories()])
    return NextResponse.json({ faqs, categories })
  } catch (e) {
    return adminErrorResponse(e, '[GET /api/admin/faqs]')
  }
}

type Body = { category?: unknown; question?: unknown; answer?: unknown; isPublished?: unknown }

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  try {
    const faq = await createFaq(
      {
        category: String(body.category ?? ''),
        question: String(body.question ?? ''),
        answer: String(body.answer ?? ''),
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
      },
      actorMeta(req, guard.session),
    )
    return NextResponse.json({ faq }, { status: 201 })
  } catch (e) {
    return adminErrorResponse(e, '[POST /api/admin/faqs]')
  }
}
