import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prepareProviderSync } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { providerId?: unknown }

/**
 * Dry-run sync preparation. Contacts no provider (live tSIM sync is Phase 4H) —
 * returns a readiness report and audits the intent.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.providerId !== 'string' || !body.providerId) {
    return NextResponse.json({ error: 'providerId is required' }, { status: 400 })
  }

  try {
    const report = await prepareProviderSync(body.providerId, actorMeta(req, guard.session))
    return NextResponse.json({ report })
  } catch (e) {
    return adminErrorResponse(e, '[POST /api/admin/plans/sync]')
  }
}
