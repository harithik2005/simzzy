'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Zap, ChevronDown, Wifi } from 'lucide-react'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { CoveragePanel } from '@/components/catalog/CoveragePanel'
import { fetchDestination, type CoverageMap, type DestinationSummary, type PlanCardDto } from '@/lib/catalog-client'

/**
 * Destination page (Phase 4G.5) — regular-plan comparison layout (Step 11) with
 * per-plan expandable network details (Step 12) + a Daily Plans CTA. Bundle
 * name (the supplier "Destination(s)") is the user-facing provider plan name.
 */
export default function CountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [dest, setDest] = useState<DestinationSummary | null>(null)
  const [plans, setPlans] = useState<PlanCardDto[]>([])
  const [coverageByBundle, setCoverageByBundle] = useState<CoverageMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const c = new AbortController()
    setLoading(true); setError(null)
    fetchDestination(slug, c.signal)
      .then((d) => { setDest(d.destination); setPlans(d.regularPlans); setCoverageByBundle(d.coverageByBundle) })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError((e as Error).message) })
      .finally(() => setLoading(false))
    return () => c.abort()
  }, [slug])

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" /></div>
  }
  if (error || !dest) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-[40px] mb-3">🌐</p>
        <p className="text-[16px] font-semibold mb-1">{error ?? 'Destination not found'}</p>
        <Link href="/browse" className="text-accent-purple text-[13px] underline">Back to browse</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link href="/browse" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} /> Browse
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="text-[44px] leading-none">{dest.flag ?? '🌍'}</span>
            <div>
              <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">{dest.name}</h1>
              <p className="text-[13px] text-muted mt-0.5">
                {dest.isSingleCountry ? dest.regionName : `${dest.countryCount} countries · ${dest.regionName}`}
                {dest.has5G && ' · 5G available'}
              </p>
            </div>
          </div>
          {dest.dailyCount > 0 && (
            <Link
              href={`/daily-plans?dest=${encodeURIComponent(dest.slug)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all"
            >
              <Zap size={15} /> View Daily Plans
            </Link>
          )}
        </div>
      </div>

      {/* Regular plans comparison */}
      <h2 className="text-[16px] font-extrabold mb-3">All Plans <span className="text-muted font-medium text-[13px]">({plans.length})</span></h2>

      {plans.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-[14px] font-semibold mb-1">No fixed-data plans for this destination.</p>
          {dest.dailyCount > 0 && (
            <Link href={`/daily-plans?dest=${encodeURIComponent(dest.slug)}`} className="text-accent-pink text-[13px] font-bold underline">Browse daily plans instead →</Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {plans.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[14px]">{p.bundle}</p>
                    {p.has5G && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-accent-pink/10 text-accent-pink border-accent-pink/25 font-mono"><Wifi size={9} /> 5G</span>}
                  </div>
                  <p className="text-[12px] text-muted mt-0.5">
                    <span className="font-semibold text-secondary">{p.tier}</span> · {p.days} {p.days === 1 ? 'day' : 'days'}
                    {p.fup && ` · ${p.fup}`}
                  </p>
                </div>
                <PriceDisplay usd={p.sellingPriceUsd} size="md" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all"
                  >
                    Details <ChevronDown size={13} className={expanded === p.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  <Link
                    href={`/checkout?plan=${encodeURIComponent(p.slug)}`}
                    className="px-4 py-2 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
                  >
                    Buy Now
                  </Link>
                </div>
              </div>
              {expanded === p.id && (
                <div className="px-4 pb-4">
                  <CoveragePanel coverage={coverageByBundle[p.bundle] ?? null} fup={p.fup} apn={p.apn} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
