import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  changePassword,
  ValidationError,
  WrongPasswordError,
} from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = { currentPassword?: unknown; newPassword?: unknown }

export async function PUT(req: NextRequest) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  try {
    await changePassword(userId, { currentPassword, newPassword })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof WrongPasswordError) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('[PUT /api/account/password]', e)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
