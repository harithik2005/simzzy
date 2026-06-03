'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useSession } from 'next-auth/react'

/**
 * Client route gate (defense-in-depth alongside middleware). Shows a loading
 * state while the session resolves, a sign-in prompt when unauthenticated, and
 * the protected content once authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-[420px]">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-accent-purple"
            style={{ background: 'rgba(147,51,234,0.12)', border: '1px solid rgba(147,51,234,0.3)' }}
          >
            <Lock size={26} />
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tight mb-2">Sign in required</h1>
          <p className="text-[14px] text-secondary mb-8 leading-relaxed">
            Sign in to view your orders, eSIMs, and account settings.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/login"
              className="px-6 py-3 rounded-[12px] bg-gradient-btn text-white text-[14px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 rounded-[12px] border border-border-hover bg-card text-secondary text-[14px] font-semibold hover:bg-card-hover hover:text-primary transition-all"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
