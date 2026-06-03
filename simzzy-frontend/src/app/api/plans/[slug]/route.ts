import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPlanBySlug } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params
  if (!slug) {
    return NextResponse.json({ error: 'Plan slug is required' }, { status: 400 })
  }

  try {
    const plan = await getPlanBySlug(slug)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    return NextResponse.json({ plan })
  } catch (e) {
    console.error(`[GET /api/plans/${slug}]`, e)
    return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 })
  }
}
