'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Check, ArrowRight } from 'lucide-react'
import { MultiDestinationSearch, POPULAR, prettifySlug, type SelectedDest } from '@/components/catalog/MultiDestinationSearch'
import { AllPlansRibbons } from '@/components/catalog/AllPlansRibbons'
import { fetchDestinations } from '@/lib/catalog-client'

/**
 * Browse (Phase 4G.5G) — comparison-focused, everything on one page:
 *   1. Search       — multi-select destination tokens (countries/regions/bundles)
 *   2. Daily Plans  — single merged CTA → the Daily Plans builder page
 *   3. All Plans    — vertical ribbon list for ALL selected destinations (OR),
 *                     each ribbon with its own 15/30 toggle + expandable details
 */
function parseDestParam(raw: string | null): SelectedDest[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
    .map((slug) => ({ slug, name: prettifySlug(slug), flag: null, regionName: '' }))
}

function BrowseInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const [selected, setSelected] = useState<SelectedDest[]>(() => parseDestParam(sp.get('dest')))
  const slugs = selected.map((s) => s.slug)

  // Free-text entry point (landing-page hero → /browse?q=Japan): resolve the
  // query to its top matching destination and seed the selection, so the hero
  // search behaves like the in-page destination search.
  const qParam = sp.get('q')
  const [resolvingQ, setResolvingQ] = useState(() => Boolean(qParam?.trim()) && parseDestParam(sp.get('dest')).length === 0)

  useEffect(() => {
    const q = qParam?.trim()
    if (!q || selected.length > 0) { setResolvingQ(false); return }
    const c = new AbortController()
    setResolvingQ(true)
    fetchDestinations({ q }, c.signal)
      .then((dests) => {
        const next = dests.length
          ? [{ slug: dests[0].slug, name: dests[0].name, flag: dests[0].flag, regionName: dests[0].regionName }]
          : []
        setSelected(next)
        router.replace(next.length ? `/browse?dest=${encodeURIComponent(next[0].slug)}` : '/browse', { scroll: false })
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') router.replace('/browse', { scroll: false }) })
      .finally(() => setResolvingQ(false))
    return () => c.abort()
    // Resolve once for the incoming ?q= value; selection changes are handled by `update`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam])

  function update(next: SelectedDest[]) {
    setSelected(next)
    router.replace(next.length ? `/browse?dest=${next.map((d) => encodeURIComponent(d.slug)).join(',')}` : '/browse', { scroll: false })
  }

  function addPopular(dest: SelectedDest) {
    if (selected.some((s) => s.slug === dest.slug)) return
    update([...selected, dest])
  }

  const dailyHref = slugs.length ? `/daily-plans?dest=${slugs.map(encodeURIComponent).join(',')}` : '/daily-plans'

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
      {/* Header */}
      <header className="text-center mb-8 md:mb-10">
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-2.5">Browse eSIMs</p>
        <h1 className="text-3xl md:text-[40px] font-extrabold tracking-tight leading-[1.1]">Where are you travelling?</h1>
        <p className="text-[14px] md:text-[15px] text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Add one or more destinations to compare plans, or build a daily plan for a short trip.
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* 1 — Search card (glass) */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 md:p-6 shadow-[0_8px_40px_-16px_rgba(147,51,234,0.35)]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="w-6 h-6 rounded-lg bg-accent-purple/15 text-accent-purple flex items-center justify-center text-[11px] font-extrabold font-mono">1</span>
            <h2 className="text-[15px] font-extrabold tracking-tight">Search destinations</h2>
          </div>

          <MultiDestinationSearch value={selected} onChange={update} autoFocus popularInline />

          {/* Popular — persistent inline chip group (no floating overlap) */}
          {selected.length === 0 && (
            <div className="mt-5 pt-5 border-t border-white/[0.06]">
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-muted mb-3">Popular destinations</p>
              <div className="flex flex-wrap gap-2.5">
                {POPULAR.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => addPopular(p)}
                    className="group inline-flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] font-semibold text-secondary transition-all hover:text-white hover:border-accent-purple/50 hover:bg-accent-purple/[0.12] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50"
                  >
                    <span className="text-[15px] leading-none">{p.flag}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 2 — Trip planner card (premium) */}
        <Link
          href={dailyHref}
          className="group relative block overflow-hidden rounded-3xl border border-accent-purple/25 bg-gradient-to-br from-accent-purple/[0.12] via-white/[0.02] to-accent-pink/[0.10] p-6 md:p-8 shadow-[0_8px_40px_-16px_rgba(147,51,234,0.4)] transition-all hover:border-accent-purple/50 hover:shadow-[0_14px_50px_-14px_rgba(147,51,234,0.55)]"
        >
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-btn" />
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-accent-purple/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-5">
            <div>
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">
                <Zap size={13} /> Daily Plans
              </p>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mt-2.5">Short trips, sorted</h2>
              <p className="text-[13.5px] md:text-[14px] text-secondary mt-1.5 max-w-md leading-relaxed">
                Build a custom plan for 1–7 days — pick where you&apos;re going, how long, and how much data per day.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Choose destination', 'Choose days', 'Choose daily data'].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[12.5px] font-medium text-secondary"
                >
                  <Check size={13} className="text-accent-green" /> {t}
                </span>
              ))}
            </div>

            <span className="inline-flex items-center justify-center gap-2 w-full sm:w-auto sm:self-start px-6 py-3.5 rounded-2xl bg-gradient-btn text-white text-[15px] font-bold shadow-[0_8px_24px_-8px_rgba(255,45,120,0.5)] transition-transform group-hover:-translate-y-0.5">
              Build daily plan <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* 3 — All Plans */}
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-[18px] font-extrabold tracking-tight">All Plans</h2>
            {slugs.length > 0 && <span className="text-[12px] text-muted">15 &amp; 30-day plans · tap a row for details</span>}
          </div>
          {slugs.length > 0 ? (
            <AllPlansRibbons
              destinationSlugs={slugs}
              onDestinationsLoaded={(dests) =>
                setSelected((cur) => cur.map((x) => {
                  const d = dests.find((dd) => dd.slug === x.slug)
                  return d ? { slug: d.slug, name: d.name, flag: d.flag, regionName: d.regionName } : x
                }))
              }
            />
          ) : resolvingQ ? (
            <div className="bg-card border border-border rounded-2xl p-10 flex items-center justify-center">
              <span className="w-7 h-7 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <p className="text-[40px] mb-3">🧭</p>
              <p className="text-[15px] font-semibold mb-1">Add a destination to compare plans</p>
              <p className="text-[13px] text-muted">Search Japan, USA, Italy, Europe… — add as many as you like.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" /></div>}>
      <BrowseInner />
    </Suspense>
  )
}
