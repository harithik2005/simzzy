'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function Hero() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag to gate client-only rendering
  useEffect(() => { setMounted(true) }, [])

  function goSearch() {
    const q = query.trim()
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')
  }

  return (
    <section
      className="relative overflow-hidden pt-[160px] pb-[100px]"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Pulsing radial glow (replaces ::before) */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-50%', left: '-50%',
          width: '200%', height: '200%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)',
          animation: 'pulse 6s ease-in-out infinite',
        }}
      />

      {/* Fade-to-deep at bottom (replaces ::after) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[120px] pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1100px] mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium text-secondary mb-7',
            mounted ? 'animate delay-1' : 'opacity-0',
          )}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
          Trusted by 500K+ travelers worldwide
        </div>

        {/* Headline */}
        <h1
          className={cn(
            'text-[36px] md:text-[56px] font-extrabold leading-[1.1] tracking-[-2px] mb-5',
            mounted ? 'animate delay-2' : 'opacity-0',
          )}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #c8b0e8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Stay connected<br />anywhere you go
        </h1>

        {/* Sub */}
        <p
          className={cn(
            'text-[15px] md:text-[17px] text-secondary max-w-[480px] mx-auto mb-9 leading-relaxed',
            mounted ? 'animate delay-3' : 'opacity-0',
          )}
        >
          Instant eSIM for 200+ countries. Buy online, scan QR code, and connect in seconds. No physical SIM needed.
        </p>

        {/* Search */}
        <div
          className={cn(
            'max-w-[520px] mx-auto mb-6 relative',
            mounted ? 'animate delay-4' : 'opacity-0',
          )}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goSearch()}
            placeholder="Where are you traveling?"
            className="w-full py-4 pl-5 pr-[130px] text-[15px] rounded-[14px] outline-none transition-all duration-300 text-white placeholder:text-muted border backdrop-blur-[10px] bg-white/[0.06] border-white/[0.12] focus:border-accent-purple focus:bg-white/[0.08] focus:shadow-[0_0_30px_rgba(147,51,234,0.15)]"
          />
          <button
            onClick={goSearch}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-5 rounded-[10px] text-white text-sm font-semibold hover:opacity-90 transition-opacity bg-gradient-btn"
          >
            Search
          </button>
        </div>

        {/* Trust line */}
        <div
          className={cn(
            'text-xs text-muted flex items-center justify-center gap-1.5',
            mounted ? 'animate delay-5' : 'opacity-0',
          )}
        >
          <span className="text-yellow-400">★★★★★</span>
          4.8 rating from 12,000+ reviews
        </div>
      </div>
    </section>
  )
}
