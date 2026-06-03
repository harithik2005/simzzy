import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listDestinations } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  try {
    const destinations = await listDestinations({
      q: sp.get('q') ?? undefined,
      region: sp.get('region') ?? undefined,
    })
    return NextResponse.json({ destinations })
  } catch (e) {
    console.error('[GET /api/catalog/destinations]', e)
    return NextResponse.json({ error: 'Failed to load destinations' }, { status: 500 })
  }
}
