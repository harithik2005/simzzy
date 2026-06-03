import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'

// Edge-safe NextAuth instance (no Prisma/bcrypt) — reads the JWT only.
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const role = session?.user?.role
  const path = nextUrl.pathname

  const isAdminPath = path.startsWith('/admin')
  const isProtected =
    isAdminPath || path.startsWith('/dashboard') || path.startsWith('/settings')

  if (!isProtected) return NextResponse.next()

  // Unauthenticated → login (preserve intended destination).
  if (!session?.user) {
    const url = new URL('/login', nextUrl)
    url.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(url)
  }

  // Admin area requires ADMIN or SUPER_ADMIN.
  if (isAdminPath && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/forbidden', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/admin',
    '/admin/:path*',
    '/settings',
    '/settings/:path*',
  ],
}
