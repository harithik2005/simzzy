import { NextResponse } from 'next/server'
import { listRates, BASE_CURRENCY } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rates = await listRates()
    return NextResponse.json({ base: BASE_CURRENCY, rates })
  } catch (e) {
    console.error('[GET /api/currency/rates]', e)
    return NextResponse.json({ error: 'Failed to load exchange rates' }, { status: 500 })
  }
}
