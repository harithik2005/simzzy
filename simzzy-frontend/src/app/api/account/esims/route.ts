import { NextResponse } from 'next/server'
import { listMyEsims } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/account/esims — current user's purchased eSIMs.
 *
 * Returns an empty array until the tSIM integration in Phase 4H populates
 * `esims` rows. Shape is final.
 */
export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const esims = await listMyEsims(userId)
  return NextResponse.json({ esims })
}
