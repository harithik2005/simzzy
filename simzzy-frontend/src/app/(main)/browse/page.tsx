'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, ChevronRight, Check } from 'lucide-react'
import { MultiDestinationSearch, prettifySlug, type SelectedDest } from '@/components/catalog/MultiDestinationSearch'
import { AllPlansRibbons } from '@/components/catalog/AllPlansRibbons'

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

  function update(next: SelectedDest[]) {
    setSelected(next)
    router.replace(next.length ? `/browse?dest=${next.map((d) => encodeURIComponent(d.slug)).join(',')}` : '/browse', { scroll: false })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="text-center mb-8">
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Browse eSIMs</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Where are you travelling?</h1>
        <p className="text-[14px] text-muted mt-2">Add one or more destinations to compare plans, or build a daily plan for a short trip.</p>
      </div>

      {/* 1 — Search (multi-select) */}
      <div className="mb-8">
        <MultiDestinationSearch value={selected} onChange={update} autoFocus />
      </div>

      {/* 2 — Daily Plans (single merged CTA) */}
      <Link
        href={slugs.length ? `/daily-plans?dest=${slugs.map(encodeURIComponent).join(',')}` : '/daily-plans'}
        className="group block mb-10 rounded-3xl border border-accent-purple/30 bg-gradient-to-br from-accent-purple/[0.12] via-card to-accent-pink/[0.08] p-6 md:p-7 relative overflow-hidden hover:border-accent-purple/50 transition-all"
      >
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-btn" />
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
              <Zap size={13} /> Daily Plans
            </p>
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight">Perfect for short trips (1–7 days)</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-secondary">
              {['Choose destination', 'Choose days', 'Choose daily data'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check size={13} className="text-accent-green" /> {t}</span>
              ))}
            </div>
          </div>
          <span className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-btn text-white text-[14px] font-bold whitespace-nowrap group-hover:-translate-y-0.5 transition-transform flex-shrink-0">
            Build Daily Plan <ChevronRight size={16} />
          </span>
        </div>
      </Link>

      {/* 3 — All Plans */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-[18px] font-extrabold tracking-tight">All Plans</h2>
          {slugs.length > 0 && <span className="text-[12px] text-muted">15 & 30-day plans · tap a row for details</span>}
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
        ) : (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <p className="text-[40px] mb-3">🧭</p>
            <p className="text-[15px] font-semibold mb-1">Add a destination to compare plans</p>
            <p className="text-[13px] text-muted">Search Japan, USA, Italy, Europe… — add as many as you like.</p>
          </div>
        )}
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
