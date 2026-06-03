import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Role } from '@prisma/client'
import { setUserRole, AdminForbiddenError } from 'simzzy-backend'
import { actorMeta, requireSuperAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/users/[id]/role — role changes are SUPER_ADMIN only.
 *
 * ADMIN cannot promote themselves to SUPER_ADMIN: the route is gated by
 * `requireSuperAdminApi`, which returns 403 for non-super admins. The service
 * layer also refuses to demote the last SUPER_ADMIN (lockout protection).
 */

type Body = { role?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  if (typeof body.role !== 'string' || !(Object.values(Role) as string[]).includes(body.role)) {
    return NextResponse.json({ error: 'role must be USER, ADMIN, or SUPER_ADMIN' }, { status: 400 })
  }

  const meta = actorMeta(req, guard.session)
  try {
    const user = await setUserRole(id, body.role as Role, {
      actorId: guard.session.user.id as string,
      actorRole: (guard.session.user.role as Role) ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    return NextResponse.json({ user })
  } catch (e) {
    if (e instanceof AdminForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(`[PUT /api/admin/users/${id}/role]`, e)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}
