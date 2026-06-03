import { redirect } from 'next/navigation'
import { Role } from 'simzzy-backend'
import { auth } from '@/auth'

/**
 * Server-side route guards for RSC, route handlers, and server actions.
 * Each returns the authenticated session (narrowed) or redirects.
 */

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPER_ADMIN) {
    redirect('/forbidden')
  }
  return session
}

export async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== Role.SUPER_ADMIN) {
    redirect('/forbidden')
  }
  return session
}
