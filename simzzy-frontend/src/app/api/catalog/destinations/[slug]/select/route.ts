import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { selectDailyPlan } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Daily Plan Selection Engine: country (slug) + days + package → matching plan. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const sp = req.nextUrl.searchParams
  const days = Number(sp.get('days'))
  const pkg = sp.get('package')
  if (!Number.isFinite(days) || days <= 0 || !pkg) {
    return NextResponse.json({ error: 'days and package are required' }, { status: 400 })
  }
  try {
    const plan = await selectDailyPlan(slug, days, pkg)
    return NextResponse.json({ plan })
  } catch (e) {
    console.error(`[GET /api/catalog/destinations/${slug}/select]`, e)
    return NextResponse.json({ error: 'Failed to select plan' }, { status: 500 })
  }
}
