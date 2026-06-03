import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AdminError, Role } from 'simzzy-backend'
import { auth } from '@/auth'
import type { Session } from 'next-auth'

/**
 * RBAC helpers for **JSON API routes**.
 *
 * Unlike `lib/auth-guards.ts` (which uses `redirect()` and is intended for
 * server components / pages), these return a `NextResponse` that the caller
 * passes through unchanged. A 401 means "not signed in", 403 means "signed in
 * but lacks the required role". JSON clients can branch on the status code.
 */

export type AdminGuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }

/** Require any authenticated session. Returns 401 JSON otherwise. */
export async function requireUserApi(): Promise<AdminGuardResult> {
  const session = await auth()
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true, session }
}

export async function requireAdminApi(): Promise<AdminGuardResult> {
  const session = await auth()
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const role = session.user.role
  if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { ok: true, session }
}

/** Like `requireAdminApi` but only SUPER_ADMIN passes. */
export async function requireSuperAdminApi(): Promise<AdminGuardResult> {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.user.role !== Role.SUPER_ADMIN) {
    return { ok: false, response: NextResponse.json({ error: 'Super admin required' }, { status: 403 }) }
  }
  return { ok: true, session }
}

/**
 * Map a thrown error to a JSON response. `AdminError`s carry a caller-facing
 * message + status (400/403/404/409); anything else is logged and returned as a
 * generic 500 so internal details never leak to the client.
 */
export function adminErrorResponse(e: unknown, context: string): NextResponse {
  if (e instanceof AdminError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  console.error(context, e)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

/** Best-effort request metadata for audit log entries. */
export function actorMeta(req: NextRequest, session: Session): {
  actorId: string
  ip: string | null
  userAgent: string | null
} {
  const xff = req.headers.get('x-forwarded-for')
  const ip = xff ? xff.split(',')[0]?.trim() ?? null : req.headers.get('x-real-ip')
  return {
    actorId: session.user.id as string,
    ip,
    userAgent: req.headers.get('user-agent'),
  }
}
