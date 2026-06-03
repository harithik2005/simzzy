import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Role, UserStatus } from '@prisma/client'
import { listAdminUsers, type ListUsersFilters } from 'simzzy-backend'
import { requireAdminApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const sp = req.nextUrl.searchParams
  const filters: ListUsersFilters = {}
  const q = sp.get('q'); if (q) filters.q = q
  const status = sp.get('status')
  if (status && (Object.values(UserStatus) as string[]).includes(status)) {
    filters.status = status as UserStatus
  }
  const role = sp.get('role')
  if (role && (Object.values(Role) as string[]).includes(role)) {
    filters.role = role as Role
  }

  try {
    const users = await listAdminUsers(filters, Number(sp.get('limit')) || 200)
    return NextResponse.json({ users })
  } catch (e) {
    console.error('[GET /api/admin/users]', e)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}
