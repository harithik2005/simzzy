import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma, UserStatus } from 'simzzy-backend'
import { authConfig } from './auth.config'

/**
 * Full NextAuth instance (Node runtime). Credentials provider verifies the
 * password with bcrypt and rejects suspended accounts. JWT session strategy
 * (required for Credentials); the Prisma adapter is present for future OAuth.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === 'string' ? credentials.email : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        // No user, or an OAuth-only account with no password set.
        if (!user || !user.passwordHash) return null

        // Block suspended accounts before checking the password.
        if (user.status === UserStatus.SUSPENDED) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        }
      },
    }),
  ],
})
