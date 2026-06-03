'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Wifi } from 'lucide-react'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { CoveragePanel } from '@/components/catalog/CoveragePanel'
import { fetchDailyPlans, type CoverageDto, type CoverageMap, type DestinationSummary, type PlanCardDto } from '@/lib/catalog-client'
import { cn } from '@/lib/utils'

/**
 * Daily plan selector — Select Days → Select Package → matching plan(s), across
 * one OR MORE destinations (Phase 4G.5G). Days/Package each have an "All" option
 * (4G.5G): choosing All on either axis, or selecting multiple destinations,
 * yields a deduped list of matching daily plans. A single destination with a
 * specific Days + Package still auto-resolves to one rich result card.
 * Client-side merge over the catalog daily APIs; no mock data.
 */
const ALL = 'all' as const
const TIER_ORDER = ['500MB', '1GB', '2GB', '3GB']
const tierIdx = (t: string | null) => { const i = TIER_ORDER.indexOf(t ?? ''); return i === -1 ? 99 : i }

export function DailyPlanSelector({
  destinationSlugs,
  onDestinationsLoaded,
  maxDays,
}: {
  destinationSlugs: string[]
  onDestinationsLoaded?: (dests: DestinationSummary[]) => void
  /** When set, only day options ≤ maxDays are offered (Daily = short trips, 1–7). */
  maxDays?: number
}) {
  const [plans, setPlans] = useState<PlanCardDto[]>([])
  const [coverageByBundle, setCoverageByBundle] = useState<CoverageMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<number | typeof ALL | null>(null)
  const [pkg, setPkg] = useState<string | typeof ALL | null>(null)

  const slugKey = destinationSlugs.join(',')
  useEffect(() => {
    if (destinationSlugs.length === 0) { setPlans([]); setLoading(false); return }
    const c = new AbortController()
    setLoading(true); setError(null); setPlans([])
    Promise.all(destinationSlugs.map((s) => fetchDailyPlans(s, c.signal)))
      .then((all) => {
        const byId = new Map<string, PlanCardDto>()
        const cov: CoverageMap = {}
        const dests: DestinationSummary[] = []
        for (const r of all) {
          if (!r.daily) continue
          for (const p of r.daily.plans) byId.set(p.id, p)
          Object.assign(cov, r.coverageByBundle)
          dests.push(r.daily.destination)
        }
        setPlans([...byId.values()]); setCoverageByBundle(cov)
        onDestinationsLoaded?.(dests)
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError((e as Error).message) })
      .finally(() => setLoading(false))
    return () => c.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey])

  const dayOptions = useMemo(() => {
    const set = new Set(plans.map((p) => p.days).filter((d) => !maxDays || d <= maxDays))
    return [...set].sort((a, b) => a - b)
  }, [plans, maxDays])
  const pkgOptions = useMemo(
    () => TIER_ORDER.filter((t) => plans.some((p) => p.dailyPackage === t)),
    [plans],
  )

  // Initialise defaults once plans load.
  useEffect(() => {
    if (plans.length === 0) return
    if (days === null) setDays(dayOptions.includes(7) ? 7 : dayOptions[dayOptions.length - 1] ?? null)
    if (pkg === null) setPkg(pkgOptions.includes('1GB') ? '1GB' : pkgOptions[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans])

  const matches = useMemo<PlanCardDto[]>(() => {
    if (plans.length === 0 || days === null || pkg === null) return []
    const filtered = plans.filter(
      (p) =>
        (days === ALL || p.days === days) &&
        (pkg === ALL || p.dailyPackage === pkg) &&
        (!maxDays || p.days <= maxDays),
    )
    // List mode dedupes per (bundle, days, package) so each destination/variant shows.
    const best = new Map<string, PlanCardDto>()
    for (const p of filtered) {
      const k = `${p.bundle}|${p.days}|${p.dailyPackage}`
      const e = best.get(k)
      if (!e || p.sellingPriceUsd < e.sellingPriceUsd) best.set(k, p)
    }
    return [...best.values()].sort(
      (a, b) => a.days - b.days || tierIdx(a.dailyPackage) - tierIdx(b.dailyPackage) || a.sellingPriceUsd - b.sellingPriceUsd || a.bundle.localeCompare(b.bundle),
    )
  }, [plans, days, pkg, maxDays])

  const singleMode = destinationSlugs.length === 1 && days !== ALL && pkg !== ALL

  if (loading) {
    return <div className="min-h-[30vh] flex items-center justify-center"><span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" /></div>
  }
  if (error || plans.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <p className="text-[40px] mb-3">📅</p>
        <p className="text-[15px] font-semibold mb-1">{error ?? 'No daily plans for this selection'}</p>
        <p className="text-[12px] text-muted">Try a different destination.</p>
      </div>
    )
  }

  // Single auto-resolved plan = cheapest match (1 destination + specific day & data).
  const single = singleMode ? [...matches].sort((a, b) => a.sellingPriceUsd - b.sellingPriceUsd)[0] ?? null : null
  const resultTitle = single ? 'Your plan' : `Matching plans (${matches.length})`

  return (
    <>
      <Section label="A" title="Select days">
        <div className="flex flex-wrap gap-2">
          {dayOptions.map((d) => (
            <DayButton key={d} active={days === d} onClick={() => setDays(d)}>{d}</DayButton>
          ))}
          <DayButton active={days === ALL} onClick={() => setDays(ALL)}>All</DayButton>
        </div>
        <p className="text-[11px] text-muted mt-2">Number of days the plan stays valid. Pick “All” to see every duration.</p>
      </Section>

      <Section label="B" title="Select daily data">
        <div className="flex flex-wrap gap-2">
          {pkgOptions.map((t) => (
            <PkgButton key={t} active={pkg === t} onClick={() => setPkg(t)}>
              {t}<span className="text-[11px] font-medium opacity-80">/day</span>
            </PkgButton>
          ))}
          <PkgButton active={pkg === ALL} onClick={() => setPkg(ALL)}>All</PkgButton>
        </div>
        <p className="text-[11px] text-muted mt-2">High-speed data per day. Pick “All” to compare every data option.</p>
      </Section>

      <Section label="C" title={resultTitle}>
        {matches.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-[14px] font-semibold mb-1">No daily plans match your selection.</p>
            <p className="text-[12px] text-muted">Try a different combination above.</p>
          </div>
        ) : single ? (
          <SingleResult plan={single} coverage={coverageByBundle[single.bundle] ?? null} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {matches.map((p) => (
              <DailyRow key={p.id} plan={p} coverage={coverageByBundle[p.bundle] ?? null} />
            ))}
          </div>
        )}
      </Section>
    </>
  )
}

function SingleResult({ plan, coverage }: { plan: PlanCardDto; coverage: CoverageDto | null }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[16px] break-words">{plan.bundle}</p>
            {plan.has5G && <Badge5G />}
          </div>
          <p className="text-[13px] text-muted mt-1">{plan.dailyPackage}/day · {plan.days} {plan.days === 1 ? 'day' : 'days'}{plan.fup ? ` · ${plan.fup}` : ''}</p>
        </div>
        <PriceDisplay usd={plan.sellingPriceUsd} size="lg" className="shrink-0" />
      </div>
      <CoveragePanel coverage={coverage} fup={plan.fup} apn={plan.apn} />
      <BuyNow slug={plan.slug} full />
    </div>
  )
}

function DailyRow({ plan, coverage }: { plan: PlanCardDto; coverage: CoverageDto | null }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[15px] break-words">{plan.bundle}</p>
              {plan.has5G && <Badge5G />}
            </div>
            <p className="text-[12px] text-muted mt-1">
              <span className="font-semibold text-secondary">{plan.dailyPackage}/day</span> · {plan.days} {plan.days === 1 ? 'day' : 'days'}{plan.fup ? ` · ${plan.fup}` : ''}
            </p>
          </div>
          <PriceDisplay usd={plan.sellingPriceUsd} size="md" className="shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3 mt-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-accent-purple hover:text-accent-pink transition-colors"
          >
            More Details <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          <BuyNow slug={plan.slug} />
        </div>
      </div>
      {open && (
        <div className="px-4 sm:px-5 pb-4">
          <CoveragePanel coverage={coverage} fup={plan.fup} apn={plan.apn} />
        </div>
      )}
    </div>
  )
}

function Badge5G() {
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-accent-pink/10 text-accent-pink border-accent-pink/25 font-mono"><Wifi size={9} /> 5G</span>
}

function BuyNow({ slug, full }: { slug: string; full?: boolean }) {
  return (
    <Link
      href={`/checkout?plan=${encodeURIComponent(slug)}`}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-btn text-white font-bold hover:opacity-90 transition-all',
        full ? 'mt-4 w-full px-5 py-3 text-[14px] hover:-translate-y-0.5' : 'px-5 py-2.5 text-[13px]',
      )}
    >
      Buy Now
    </Link>
  )
}

function DayButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('min-w-[44px] px-3 py-2.5 rounded-xl text-[14px] font-bold border transition-all', active ? 'bg-gradient-btn text-white border-transparent' : 'bg-card border-border text-secondary hover:border-border-hover hover:text-primary')}>{children}</button>
  )
}
function PkgButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('px-4 py-2.5 rounded-xl text-[14px] font-bold border transition-all', active ? 'bg-gradient-btn text-white border-transparent' : 'bg-card border-border text-secondary hover:border-border-hover hover:text-primary')}>{children}</button>
  )
}
function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 rounded-lg bg-accent-purple/15 text-accent-purple flex items-center justify-center text-[12px] font-extrabold font-mono">{label}</span>
        <h2 className="text-[16px] font-extrabold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  )
}
