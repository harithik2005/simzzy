import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Role, UserStatus } from '@prisma/client'
import { setUserStatus, AdminForbiddenError } from 'simzzy-backend'
import { actorMeta, requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { status?: unknown }

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const { id } = await ctx.params
  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  if (typeof body.status !== 'string' || !(Object.values(UserStatus) as string[]).includes(body.status)) {
    return NextResponse.json({ error: 'status must be ACTIVE or SUSPENDED' }, { status: 400 })
  }

  const meta = actorMeta(req, guard.session)
  try {
    const user = await setUserStatus(id, body.status as UserStatus, {
      actorId: guard.session.user.id as string,
      actorRole: (guard.session.user.role as Role) ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    return NextResponse.json({ user })
  } catch (e) {
    if (e instanceof AdminForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    console.error(`[PUT /api/admin/users/${id}/status]`, e)
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
  }
}
