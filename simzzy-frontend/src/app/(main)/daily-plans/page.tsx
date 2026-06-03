'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'
import { DailyPlanSelector } from '@/components/catalog/DailyPlanSelector'
import { MultiDestinationSearch, prettifySlug, type SelectedDest } from '@/components/catalog/MultiDestinationSearch'

/**
 * Daily Plan Builder (Phase 4G.5G) — short trips, 1–7 days.
 *   Step 1 Destinations (multi-select) → Step 2 Days (1–7 / All) → Step 3 Daily
 *   data (500MB–3GB / All) → matching plan(s). Selecting multiple destinations
 *   shows daily plans across them (OR). No catalog browsing.
 */
function parseDestParam(raw: string | null): SelectedDest[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
    .map((slug) => ({ slug, name: prettifySlug(slug), flag: null, regionName: '' }))
}

function BuilderInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const [selected, setSelected] = useState<SelectedDest[]>(() => parseDestParam(sp.get('dest')))
  const slugs = selected.map((s) => s.slug)

  function update(next: SelectedDest[]) {
    setSelected(next)
    router.replace(next.length ? `/daily-plans?dest=${next.map((d) => encodeURIComponent(d.slug)).join(',')}` : '/daily-plans', { scroll: false })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center gap-3 mb-8">
        <span className="w-11 h-11 rounded-2xl bg-gradient-btn flex items-center justify-center text-white"><Zap size={20} /></span>
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-1">Short Trips · 1–7 Days</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Build your daily plan</h1>
        </div>
      </div>

      {/* Step 1 — Destinations */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-7 h-7 rounded-lg bg-accent-purple/15 text-accent-purple flex items-center justify-center text-[12px] font-extrabold font-mono">1</span>
          <h2 className="text-[16px] font-extrabold tracking-tight">Choose destinations</h2>
        </div>
        <MultiDestinationSearch value={selected} onChange={update} autoFocus />
      </div>

      {/* Steps 2–4 */}
      {slugs.length > 0 && (
        <DailyPlanSelector
          destinationSlugs={slugs}
          maxDays={7}
          onDestinationsLoaded={(dests) =>
            setSelected((cur) => cur.map((x) => {
              const d = dests.find((dd) => dd.slug === x.slug)
              return d ? { slug: d.slug, name: d.name, flag: d.flag, regionName: d.regionName } : x
            }))
          }
        />
      )}
    </div>
  )
}

export default function DailyPlansBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" /></div>}>
      <BuilderInner />
    </Suspense>
  )
}
