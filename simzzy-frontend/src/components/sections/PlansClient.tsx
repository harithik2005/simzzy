'use client'

import Link from 'next/link'
import type { PlanListItem } from 'simzzy-backend'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { displayPriceUsd } from '@/lib/plan-client'

export default function PlansClient({ plans }: { plans: PlanListItem[] }) {
  const { ref, inView } = useInView()

  // Featured layout: middle card pops if it's flagged popular or has a badge.
  const featuredIndex = plans.findIndex((p) => p.popular || p.badge === 'Popular')
  const featuredKey = featuredIndex >= 0 ? plans[featuredIndex].slug : plans[1]?.slug

  return (
    <section ref={ref} id="plans" className="py-20 bg-mid border-y border-border">
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <p className={cn('font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3', inView ? 'animate' : 'opacity-0')}>
          Plans
        </p>
        <h2 className={cn('text-[36px] font-bold tracking-tight mb-3', inView ? 'animate delay-1' : 'opacity-0')}>
          Best selling plans
        </h2>
        <p className={cn('text-[15px] text-secondary mb-10', inView ? 'animate delay-2' : 'opacity-0')}>
          Affordable data plans for your next trip
        </p>

        {/* Plans grid */}
        {plans.length === 0 ? (
          <p className="text-secondary text-[14px]">No featured plans available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, i) => {
              const isFeatured = plan.slug === featuredKey
              const price = displayPriceUsd(plan)
              return (
                <div
                  key={plan.slug}
                  className={cn(
                    'relative rounded-2xl p-7 overflow-hidden transition-all duration-300 hover:-translate-y-1',
                    isFeatured
                      ? 'border border-accent-purple bg-accent-purple/[0.06]'
                      : 'bg-card border border-border hover:border-border-hover',
                    inView ? `animate delay-${i + 2}` : 'opacity-0',
                  )}
                >
                  {isFeatured && (
                    <span className="absolute top-4 right-4 bg-gradient-btn text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {plan.badge ?? 'Popular'}
                    </span>
                  )}

                  <Link href={`/plans/${plan.slug}`} className="block group">
                    {plan.flag && <span className="text-[32px] mb-3 block">{plan.flag}</span>}
                    <div className="text-lg font-bold mb-1 group-hover:text-accent-pink transition-colors">
                      {plan.country ?? plan.region?.name ?? plan.name}
                    </div>
                    <div className="text-xs text-muted mb-4">
                      {plan.network ?? 'Multi-network'} · Instant activation
                    </div>

                    <div className="border-y border-border py-4 mb-5 flex flex-col gap-2">
                      {[
                        { label: 'Data',     value: plan.data },
                        { label: 'Validity', value: `${plan.days} days` },
                        { label: 'Network',  value: plan.network ?? '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-[13px]">
                          <span className="text-muted">{label}</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>

                    <PriceDisplay usd={price} size="lg" suffix="/plan" className="mb-4" />
                  </Link>

                  <Link
                    href={`/checkout?plan=${plan.slug}`}
                    className={cn(
                      'block w-full py-3 rounded-[10px] text-sm font-semibold text-center transition-all duration-200',
                      isFeatured
                        ? 'bg-gradient-btn text-white hover:opacity-90'
                        : 'bg-card-hover text-primary border border-border hover:bg-white/[0.12]',
                    )}
                  >
                    Buy now
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
