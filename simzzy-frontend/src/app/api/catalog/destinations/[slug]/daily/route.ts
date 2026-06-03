import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCoverageMap, getDailyPlans } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  try {
    const daily = await getDailyPlans(slug)
    if (!daily) return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    const coverageByBundle = await getCoverageMap(slug)
    return NextResponse.json({ daily, coverageByBundle })
  } catch (e) {
    console.error(`[GET /api/catalog/destinations/${slug}/daily]`, e)
    return NextResponse.json({ error: 'Failed to load daily plans' }, { status: 500 })
  }
}
