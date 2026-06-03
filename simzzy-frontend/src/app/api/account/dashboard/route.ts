import { NextResponse } from 'next/server'
import { getDashboardSummary } from 'simzzy-backend'
import { requireUserApi } from '@/lib/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireUserApi()
  if (!guard.ok) return guard.response
  const userId = guard.session.user.id as string
  const summary = await getDashboardSummary(userId)
  if (!summary) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ summary })
}
