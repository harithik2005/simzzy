import type { NextAuthConfig } from 'next-auth'
import type { Role, UserStatus } from 'simzzy-backend'

/**
 * Edge-safe base config — shared by the Node-runtime `auth.ts` and the
 * middleware. Contains NO Prisma/bcrypt (those can't run on the edge); the
 * Credentials provider + adapter are added in `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [], // real providers attached in auth.ts (Node runtime)
  callbacks: {
    // Persist id/role/status onto the JWT at sign-in.
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role: Role; status: UserStatus }
        if (u.id) token.id = u.id
        token.role = u.role
        token.status = u.status
      }
      return token
    },
    // Surface id/role/status on the session for the client + server.
    // (token fields are populated by the jwt callback above.)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.status = token.status as UserStatus
      }
      return session
    },
  },
} satisfies NextAuthConfig
