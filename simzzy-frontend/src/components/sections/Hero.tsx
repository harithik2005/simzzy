'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { fetchDestinations, type DestinationSummary } from '@/lib/catalog-client'
import { cn } from '@/lib/utils'

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export default function Hero() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  // ── Autocomplete state ──
  const debounced = useDebounce(query, 220)
  const [results, setResults] = useState<DestinationSummary[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag to gate client-only rendering
  useEffect(() => { setMounted(true) }, [])

  const load = useCallback(async (q: string, signal?: AbortSignal) => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    try { setResults(await fetchDestinations({ q }, signal)) }
    catch (e) { if ((e as Error).name !== 'AbortError') setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const c = new AbortController()
    load(debounced, c.signal)
    setActive(0)
    return () => c.abort()
  }, [debounced, load])

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function goToDestination(slug: string) {
    router.push(`/browse?dest=${encodeURIComponent(slug)}`)
  }

  function goSearch() {
    const q = query.trim()
    // If a suggestion is highlighted, open it directly; else resolve the free text on /browse.
    const picked = results[active]
    if (q && picked) return goToDestination(picked.slug)
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); goSearch() }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const showDropdown = open && query.trim().length > 0

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
          ref={rootRef}
          className={cn(
            'max-w-[520px] mx-auto mb-6 relative text-left',
            mounted ? 'animate delay-4' : 'opacity-0',
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Where are you traveling?"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls="hero-search-results"
            aria-label="Search destinations"
            className="w-full py-4 pl-5 pr-[130px] text-[15px] rounded-[14px] outline-none transition-all duration-300 text-white placeholder:text-muted border backdrop-blur-[10px] bg-white/[0.06] border-white/[0.12] focus:border-accent-purple focus:bg-white/[0.08] focus:shadow-[0_0_30px_rgba(147,51,234,0.15)]"
          />
          <button
            onClick={goSearch}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-5 rounded-[10px] text-white text-sm font-semibold hover:opacity-90 transition-opacity bg-gradient-btn"
          >
            Search
          </button>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <div
              id="hero-search-results"
              role="listbox"
              className="absolute z-50 left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl"
            >
              {loading && results.length === 0 ? (
                <div className="py-6 flex items-center justify-center">
                  <span className="w-6 h-6 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <p className="p-4 text-[13px] text-muted text-center">No destinations match “{debounced}”.</p>
              ) : (
                <ul className="max-h-[320px] overflow-y-auto py-1">
                  {results.slice(0, 8).map((r, i) => (
                    <li key={r.slug} role="option" aria-selected={i === active}>
                      <button
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => { e.preventDefault(); goToDestination(r.slug) }}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors',
                          i === active ? 'bg-card-hover' : 'hover:bg-card-hover',
                        )}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[20px] leading-none">{r.flag ?? '🌍'}</span>
                          <span className="font-semibold text-[14px] truncate text-primary">{r.name}</span>
                        </span>
                        <span className="text-[11px] text-muted flex-shrink-0">
                          {r.isSingleCountry ? r.regionName : `${r.regionName} · ${r.countryCount} countries`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
