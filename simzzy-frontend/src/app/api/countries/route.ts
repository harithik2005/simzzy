import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { listCountries, type CountryListFilters } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const filters: CountryListFilters = {}

    const region = sp.get('region')
    if (region) filters.region = region

    const q = sp.get('q')
    if (q) filters.q = q

    const withPlansOnly = sp.get('withPlansOnly')
    if (withPlansOnly === '1' || withPlansOnly === 'true') filters.withPlansOnly = true

    const countries = await listCountries(filters)
    return NextResponse.json({ countries })
  } catch (e) {
    console.error('[GET /api/countries]', e)
    return NextResponse.json({ error: 'Failed to load countries' }, { status: 500 })
  }
}
