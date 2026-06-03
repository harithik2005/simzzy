'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { CoveragePanel } from '@/components/catalog/CoveragePanel'
import { fetchDestination, type CoverageDto, type CoverageMap, type DestinationSummary, type PlanCardDto } from '@/lib/catalog-client'
import { cn } from '@/lib/utils'

/**
 * All Plans — vertical ribbon list (Phase 4G.5F). One ribbon per (bundle + data)
 * offering, each with its OWN 15/30 validity toggle that dynamically swaps the
 * underlying plan (price + slug) with no reload. Buy Now is always visible;
 * "More Details" expands the imported NetworkCoverage (providers, countries,
 * 3G/4G/5G, APN, FUP). No grid, no horizontal scroll. Lives on /browse.
 */

const VALIDITIES = [15, 30] as const

type Ribbon = {
  key: string
  bundle: string
  tier: string
  sortMb: number
  byDays: Map<number, PlanCardDto>
}

function parseMb(tier: string): number {
  const m = /^([\d.]+)\s*(GB|MB|TB)/i.exec(tier)
  if (!m) return 0
  const n = parseFloat(m[1]); const u = m[2].toUpperCase()
  return u === 'TB' ? n * 1024 * 1024 : u === 'GB' ? n * 1024 : n
}

export function AllPlansRibbons({
  destinationSlugs,
  onDestinationsLoaded,
}: {
  destinationSlugs: string[]
  onDestinationsLoaded?: (dests: DestinationSummary[]) => void
}) {
  const [plans, setPlans] = useState<PlanCardDto[]>([])
  const [coverageByBundle, setCoverageByBundle] = useState<CoverageMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const slugKey = destinationSlugs.join(',')
  useEffect(() => {
    if (destinationSlugs.length === 0) { setPlans([]); setCoverageByBundle({}); setLoading(false); return }
    const c = new AbortController()
    setLoading(true); setError(null); setPlans([])
    // OR across destinations: fetch each in parallel, merge plans + coverage.
    Promise.all(destinationSlugs.map((s) => fetchDestination(s, c.signal)))
      .then((all) => {
        const byId = new Map<string, PlanCardDto>()
        const cov: CoverageMap = {}
        const dests: DestinationSummary[] = []
        for (const d of all) {
          for (const p of d.regularPlans) byId.set(p.id, p)
          Object.assign(cov, d.coverageByBundle)
          if (d.destination) dests.push(d.destination)
        }
        setPlans([...byId.values()]); setCoverageByBundle(cov)
        onDestinationsLoaded?.(dests)
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError((e as Error).message) })
      .finally(() => setLoading(false))
    return () => c.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey])

  const ribbons = useMemo<Ribbon[]>(() => {
    const groups = new Map<string, Ribbon>()
    for (const p of plans) {
      if (p.days !== 15 && p.days !== 30) continue // All Plans = long-trip validities
      const key = `${p.bundle}__${p.tier}`
      let g = groups.get(key)
      if (!g) { g = { key, bundle: p.bundle, tier: p.tier, sortMb: parseMb(p.tier), byDays: new Map() }; groups.set(key, g) }
      // keep cheapest if duplicate (bundle,tier,days)
      const existing = g.byDays.get(p.days)
      if (!existing || p.sellingPriceUsd < existing.sellingPriceUsd) g.byDays.set(p.days, p)
    }
    return [...groups.values()].sort((a, b) => a.bundle.localeCompare(b.bundle) || a.sortMb - b.sortMb)
  }, [plans])

  if (loading) {
    return <div className="min-h-[30vh] flex items-center justify-center"><span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" /></div>
  }
  if (error) {
    return <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">{error}</div>
  }
  if (ribbons.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <p className="text-[14px] font-semibold mb-1">No 15 or 30-day plans for this destination.</p>
        <p className="text-[12px] text-muted">Try a daily plan for shorter trips.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {ribbons.map((r) => (
        <PlanRibbon key={r.key} ribbon={r} coverage={coverageByBundle[r.bundle] ?? null} />
      ))}
    </div>
  )
}

function TechBadges({ coverage }: { coverage: CoverageDto | null }) {
  if (!coverage) return null
  return (
    <span className="inline-flex items-center gap-1">
      {coverage.has3G && <Tech tone="gray">3G</Tech>}
      {coverage.has4G && <Tech tone="green">4G</Tech>}
      {coverage.has5G && <Tech tone="pink">5G</Tech>}
    </span>
  )
}
function Tech({ children, tone }: { children: React.ReactNode; tone: 'gray' | 'green' | 'pink' }) {
  const cls = tone === 'pink' ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/25'
    : tone === 'green' ? 'bg-accent-green/10 text-accent-green border-accent-green/25'
    : 'bg-card text-muted border-border'
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border font-mono ${cls}`}>{children}</span>
}

function PlanRibbon({ ribbon, coverage }: { ribbon: Ribbon; coverage: CoverageDto | null }) {
  const has15 = ribbon.byDays.has(15)
  const [validity, setValidity] = useState<number>(has15 ? 15 : 30)
  const [open, setOpen] = useState(false)
  const plan = ribbon.byDays.get(validity) ?? ribbon.byDays.get(has15 ? 15 : 30)!

  const coverageText = coverage
    ? coverage.countryCount === 1
      ? (coverage.countries[0]?.name ?? '1 country')
      : `${coverage.countryCount} countries`
    : null

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[15px] break-words">{ribbon.bundle}</p>
              <TechBadges coverage={coverage} />
            </div>
            <p className="text-[12px] text-muted mt-1">
              <span className="font-semibold text-secondary">{ribbon.tier}</span>
              {coverageText && <> · {coverageText}</>}
            </p>
          </div>
          {/* Price */}
          <PriceDisplay usd={plan.sellingPriceUsd} size="md" className="shrink-0" />
        </div>

        {/* Controls: validity toggle + buy */}
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
          <div className="inline-flex p-1 rounded-xl bg-mid border border-border" role="group" aria-label="Validity">
            {VALIDITIES.map((v) => {
              const available = ribbon.byDays.has(v)
              return (
                <button
                  key={v}
                  disabled={!available}
                  aria-pressed={validity === v}
                  onClick={() => available && setValidity(v)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                    validity === v ? 'bg-gradient-btn text-white' : 'text-secondary hover:text-primary',
                    !available && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  {v} Days
                </button>
              )
            })}
          </div>
          <Link
            href={`/checkout?plan=${encodeURIComponent(plan.slug)}`}
            className="px-5 py-2.5 rounded-xl bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 transition-opacity"
          >
            Buy Now
          </Link>
        </div>

        {/* More details toggle (lower portion) */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-accent-purple hover:text-accent-pink transition-colors"
        >
          More Details <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-4">
          <CoveragePanel coverage={coverage} fup={plan.fup} apn={plan.apn} />
        </div>
      )}
    </div>
  )
}
