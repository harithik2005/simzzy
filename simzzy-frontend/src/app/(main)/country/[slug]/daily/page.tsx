'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DailyPlanSelector } from '@/components/catalog/DailyPlanSelector'
import type { DestinationSummary } from '@/lib/catalog-client'

/**
 * Per-country daily page. Header + the shared <DailyPlanSelector> (Steps A/B/C).
 * Logic lives in the selector so the unified /daily-plans builder reuses it.
 */
export default function DailyPlansPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [dest, setDest] = useState<DestinationSummary | null>(null)

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <Link href={`/country/${dest?.slug ?? slug}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary mb-6 transition-colors">
        <ArrowLeft size={15} /> {dest?.name ?? 'Back'}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <span className="text-[44px] leading-none">{dest?.flag ?? '🌍'}</span>
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-1">Daily Plans</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">{dest?.name ?? 'Daily Plans'}</h1>
        </div>
      </div>

      <DailyPlanSelector destinationSlugs={[slug]} onDestinationsLoaded={(d) => setDest(d[0] ?? null)} />
    </div>
  )
}
