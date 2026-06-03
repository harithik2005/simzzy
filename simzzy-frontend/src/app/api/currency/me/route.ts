import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getVisitorPricing, SUPPORTED_CURRENCIES } from 'simzzy-backend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Pull the most likely visitor IP off the standard proxy headers. Vercel,
 * Cloudflare, and most LBs set `x-forwarded-for` (a comma-separated list with
 * the original client first); `x-real-ip` is a common fallback.
 */
function resolveIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? null
}

export async function GET(req: NextRequest) {
  try {
    const override = req.nextUrl.searchParams.get('currency')?.toUpperCase()
    const ip = resolveIp(req)
    const result = await getVisitorPricing(ip, override)
    return NextResponse.json({
      ...result,
      supported: SUPPORTED_CURRENCIES,
    })
  } catch (e) {
    console.error('[GET /api/currency/me]', e)
    return NextResponse.json({ error: 'Failed to resolve currency' }, { status: 500 })
  }
}
