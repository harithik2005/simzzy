import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { searchPlans } from 'simzzy-backend'
import { parsePlanListParams } from '../_parse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const q = (sp.get('q') ?? '').trim()
    if (!q) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 },
      )
    }

    // Reuse the shared filter parser, then strip `q` so we can hand it
    // separately to `searchPlans` (whose signature requires q + extras).
    const { filters, ...rest } = parsePlanListParams(sp)
    const { q: _ignored, ...extras } = filters ?? {}
    void _ignored

    const result = await searchPlans(q, { ...rest, filters: extras })
    return NextResponse.json({ ...result, query: q })
  } catch (e) {
    console.error('[GET /api/plans/search]', e)
    return NextResponse.json({ error: 'Failed to search plans' }, { status: 500 })
  }
}
