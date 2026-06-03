import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPreferences, updatePreferences, type UpdatePreferencesInput } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const preferences = await getPreferences(userId)
  return NextResponse.json({ preferences })
}

type Body = Record<string, unknown>

const BOOLEAN_KEYS = ['emailNotifications', 'orderUpdates', 'expiryReminders', 'marketingEmail', 'smsNotifications'] as const

export async function PUT(req: NextRequest) {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string

  let body: Body
  try { body = (await req.json()) as Body } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const patch: UpdatePreferencesInput = {}
  for (const key of BOOLEAN_KEYS) {
    if (typeof body[key] === 'boolean') patch[key] = body[key] as boolean
  }
  if ('preferredCurrency' in body) {
    patch.preferredCurrency =
      typeof body.preferredCurrency === 'string'
        ? body.preferredCurrency
        : body.preferredCurrency === null ? null : undefined
  }
  if ('preferredLanguage' in body) {
    patch.preferredLanguage =
      typeof body.preferredLanguage === 'string'
        ? body.preferredLanguage
        : body.preferredLanguage === null ? null : undefined
  }

  try {
    const preferences = await updatePreferences(userId, patch)
    return NextResponse.json({ preferences })
  } catch (e) {
    console.error('[PUT /api/account/preferences]', e)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
