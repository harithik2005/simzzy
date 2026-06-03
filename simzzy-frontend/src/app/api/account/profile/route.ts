import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getProfile,
  updateProfile,
  ValidationError,
  type UpdateProfileInput,
} from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const profile = await getProfile(userId)
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ profile })
}

type Body = {
  name?: unknown
  phone?: unknown
  countryCode?: unknown
  timezone?: unknown
}

export async function PUT(req: NextRequest) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const patch: UpdateProfileInput = {}
  if ('name' in body) patch.name = typeof body.name === 'string' ? body.name : body.name === null ? null : undefined
  if ('phone' in body) patch.phone = typeof body.phone === 'string' ? body.phone : body.phone === null ? null : undefined
  if ('countryCode' in body) patch.countryCode = typeof body.countryCode === 'string' ? body.countryCode : body.countryCode === null ? null : undefined
  if ('timezone' in body) patch.timezone = typeof body.timezone === 'string' ? body.timezone : body.timezone === null ? null : undefined

  try {
    const profile = await updateProfile(userId, patch)
    return NextResponse.json({ profile })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('[PUT /api/account/profile]', e)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
