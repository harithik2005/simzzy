import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listPlans } from 'simzzy-backend'
import { parsePlanListParams } from './_parse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const params = parsePlanListParams(req.nextUrl.searchParams)
    const result = await listPlans(params)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[GET /api/plans]', e)
    return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })
  }
}
