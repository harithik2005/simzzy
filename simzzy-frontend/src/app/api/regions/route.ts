import { NextResponse } from 'next/server'
import { listRegions } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const regions = await listRegions()
    return NextResponse.json({ regions })
  } catch (e) {
    console.error('[GET /api/regions]', e)
    return NextResponse.json({ error: 'Failed to load regions' }, { status: 500 })
  }
}
