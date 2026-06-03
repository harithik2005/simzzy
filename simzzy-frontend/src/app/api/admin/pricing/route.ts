import { NextResponse } from 'next/server'
import { deriveStats, getRuleSet } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Returns the full pricing rule set + derived stats for the admin Pricing Center. */
export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  try {
    const ruleSet = await getRuleSet()
    const stats = deriveStats(ruleSet)
    return NextResponse.json({ ruleSet, stats })
  } catch (e) {
    console.error('[GET /api/admin/pricing]', e)
    return NextResponse.json({ error: 'Failed to load pricing rules' }, { status: 500 })
  }
}
