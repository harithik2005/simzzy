import { NextResponse } from 'next/server'
import { listEsimProviders, listPaymentProviders } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  try {
    const esim = await listEsimProviders()
    const payment = await listPaymentProviders()
    return NextResponse.json({ esim, payment })
  } catch (e) {
    console.error('[GET /api/admin/providers]', e)
    return NextResponse.json({ error: 'Failed to load providers' }, { status: 500 })
  }
}
