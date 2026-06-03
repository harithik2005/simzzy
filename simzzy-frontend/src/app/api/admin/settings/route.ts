import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Role, getSettings, updateSettings } from 'simzzy-backend'
import { actorMeta, adminErrorResponse, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  try {
    const settings = await getSettings()
    return NextResponse.json({ settings })
  } catch (e) {
    return adminErrorResponse(e, '[GET /api/admin/settings]')
  }
}

type Body = { updates?: unknown }

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.updates !== 'object' || body.updates === null || Array.isArray(body.updates)) {
    return NextResponse.json({ error: 'updates must be an object of key/value pairs' }, { status: 400 })
  }

  const meta = actorMeta(req, guard.session)
  try {
    // Per-key SUPER_ADMIN gating is enforced inside updateSettings using this role.
    const settings = await updateSettings(body.updates as Record<string, unknown>, {
      ...meta,
      role: (guard.session.user.role as Role) ?? Role.ADMIN,
    })
    return NextResponse.json({ settings })
  } catch (e) {
    return adminErrorResponse(e, '[PUT /api/admin/settings]')
  }
}
