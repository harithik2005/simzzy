'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { fetchDestinations, type DestinationSummary } from '@/lib/catalog-client'
import { cn } from '@/lib/utils'

/**
 * MultiDestinationSearch (Phase 4G.5G) — the single, site-wide destination
 * search. A token/chip multi-select: pick several destinations (countries,
 * regions, or provider bundles — anything `listDestinations` matches, including
 * by covered-country name), shown as removable chips. Debounced typeahead,
 * full keyboard nav (↑/↓/Enter/Backspace/Esc) and mouse selection. Results that
 * consume this should treat the selection as OR (match ANY selected).
 *
 * Selection is OR across the catalog's searchable units; searching e.g. "Italy"
 * surfaces the bundle(s) covering Italy.
 */

export type SelectedDest = { slug: string; name: string; flag: string | null; regionName: string }

export const POPULAR: SelectedDest[] = [
  { slug: 'japan', name: 'Japan', flag: '🇯🇵', regionName: 'East Asia' },
  { slug: 'usa', name: 'USA', flag: '🇺🇸', regionName: 'North America' },
  { slug: 'europe', name: 'Europe', flag: '🇪🇺', regionName: 'Europe' },
  { slug: 'thailand', name: 'Thailand', flag: '🇹🇭', regionName: 'East Asia' },
  { slug: 'asia', name: 'Asia', flag: '🌏', regionName: 'East Asia' },
  { slug: 'global', name: 'Global', flag: '🌍', regionName: 'Global' },
]

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

const toSel = (d: DestinationSummary): SelectedDest => ({ slug: d.slug, name: d.name, flag: d.flag, regionName: d.regionName })

export function MultiDestinationSearch({
  value,
  onChange,
  placeholder = 'Search countries or regions — e.g. Japan, Italy, Europe',
  autoFocus,
  popularInline = false,
}: {
  value: SelectedDest[]
  onChange: (next: SelectedDest[]) => void
  placeholder?: string
  autoFocus?: boolean
  /** When true the dropdown only opens for typeahead results; the caller is
   *  expected to render popular destinations inline (no floating panel that
   *  could overlap content below). */
  popularInline?: boolean
}) {
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 250)
  const [results, setResults] = useState<DestinationSummary[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedSlugs = new Set(value.map((v) => v.slug))
  const visible = results.filter((r) => !selectedSlugs.has(r.slug))

  const load = useCallback(async (q: string, signal?: AbortSignal) => {
    if (!q.trim()) { setResults([]); return }
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

  // Close dropdown on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function add(d: SelectedDest) {
    if (!selectedSlugs.has(d.slug)) onChange([...value, d])
    setQuery(''); setResults([]); setActive(0)
    inputRef.current?.focus()
  }
  function remove(slug: string) {
    onChange(value.filter((v) => v.slug !== slug))
  }
  function clearAll() { onChange([]) }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, visible.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = visible[active]; if (r) add(toSel(r)) }
    else if (e.key === 'Backspace' && query === '' && value.length) { remove(value[value.length - 1].slug) }
    else if (e.key === 'Escape') { setQuery(''); setOpen(false) }
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Token input */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
        className="flex flex-wrap items-center gap-2 min-h-[58px] bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 transition-all cursor-text focus-within:border-accent-purple/60 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_4px_rgba(147,51,234,0.12)]"
      >
        <Search size={17} className="text-muted flex-shrink-0 ml-1" />
        {value.map((v) => (
          <span
            key={v.slug}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-accent-purple/15 border border-accent-purple/30 text-[13px] font-semibold text-primary"
            style={{ animation: 'fadeIn 0.15s ease' }}
          >
            <span>{v.flag ?? '🌍'}</span>
            <span className="max-w-[160px] truncate">{v.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(v.slug) }}
              className="w-4 h-4 rounded-full flex items-center justify-center text-muted hover:text-accent-pink hover:bg-card transition-colors"
              aria-label={`Remove ${v.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? 'Add another…' : placeholder}
          className="flex-1 min-w-[140px] bg-transparent border-0 outline-none text-[15px] text-primary placeholder:text-muted py-1"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearAll() }}
            className="text-[11px] font-bold text-muted hover:text-accent-pink transition-colors px-2 py-1 flex-shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Dropdown — typeahead. When popularInline, never open just to show
          popular (the caller renders those inline), avoiding overlap. */}
      {open && (query.trim() || (!popularInline && value.length === 0)) && (
        <div className="absolute z-30 left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {!query.trim() ? (
            <div className="p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-2 px-1">Popular destinations</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR.filter((p) => !selectedSlugs.has(p.slug)).map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => add(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mid border border-border text-[13px] font-semibold text-secondary hover:border-border-hover hover:text-primary transition-all"
                  >
                    <span>{p.flag}</span> {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : loading && visible.length === 0 ? (
            <div className="py-6 flex items-center justify-center"><span className="w-6 h-6 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" /></div>
          ) : visible.length === 0 ? (
            <p className="p-4 text-[13px] text-muted text-center">No destinations match “{debounced}”.</p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto py-1" role="listbox">
              {visible.slice(0, 12).map((r, i) => (
                <li key={r.slug} role="option" aria-selected={i === active}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => add(toSel(r))}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors',
                      i === active ? 'bg-card-hover' : 'hover:bg-card-hover',
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[20px] leading-none">{r.flag ?? '🌍'}</span>
                      <span className="font-semibold text-[14px] truncate">{r.name}</span>
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
  )
}

/** Title-case a slug for a chip label when only the slug is known (URL restore). */
export function prettifySlug(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
