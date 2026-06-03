import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCoverageMap, getDestination, getRegularPlans } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  try {
    const destination = await getDestination(slug)
    if (!destination) return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    const [regularPlans, coverageByBundle] = await Promise.all([getRegularPlans(slug), getCoverageMap(slug)])
    return NextResponse.json({ destination, regularPlans, coverageByBundle })
  } catch (e) {
    console.error(`[GET /api/catalog/destinations/${slug}]`, e)
    return NextResponse.json({ error: 'Failed to load destination' }, { status: 500 })
  }
}
