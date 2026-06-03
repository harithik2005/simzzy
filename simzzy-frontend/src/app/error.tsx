'use client'

import Link from 'next/link'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-[440px]">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-[30px] mx-auto mb-6"
          style={{
            background: 'rgba(255,45,120,0.1)',
            border: '1px solid rgba(255,45,120,0.3)',
          }}
        >
          ⚠️
        </div>
        <h1 className="text-[26px] font-extrabold tracking-tight mb-2">Something went wrong</h1>
        <p className="text-[14px] text-secondary mb-8 leading-relaxed">
          An unexpected error occurred. You can try again, or head back to the homepage.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-[12px] bg-gradient-btn text-white text-[14px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-[12px] border border-border-hover bg-card text-secondary text-[14px] font-semibold hover:bg-card-hover hover:text-primary transition-all"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
