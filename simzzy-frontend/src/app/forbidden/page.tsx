import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Access denied',
  robots: { index: false, follow: false },
}

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--gradient-hero)' }}>
      <div className="text-center max-w-[440px]">
        <p
          className="text-[80px] font-extrabold leading-none mb-2 text-gradient"
          style={{ WebkitBackgroundClip: 'text' }}
        >
          403
        </p>
        <h1 className="text-[22px] font-bold tracking-tight mb-2">Access denied</h1>
        <p className="text-[14px] text-secondary mb-8 leading-relaxed">
          You don&apos;t have permission to view this page. If you believe this is a mistake,
          contact an administrator.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 rounded-[12px] bg-gradient-btn text-white text-[14px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all"
          >
            Back to home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-[12px] border border-border-hover bg-card text-secondary text-[14px] font-semibold hover:bg-card-hover hover:text-primary transition-all"
          >
            My dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
