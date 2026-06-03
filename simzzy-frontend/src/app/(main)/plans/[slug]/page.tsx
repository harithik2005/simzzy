import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { getPlanBySlug } from 'simzzy-backend'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { displayPriceUsd } from '@/lib/plan-client'

type Params = { slug: string }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const plan = await getPlanBySlug(slug)
  if (!plan) return { title: 'Plan not found' }
  const price = displayPriceUsd(plan)
  return {
    title: `${plan.name} eSIM`,
    description: `${plan.data} of data over ${plan.days} days${plan.country ? ` in ${plan.country}` : ''}. Instant eSIM activation from $${price.toFixed(2)}.`,
    alternates: { canonical: `/plans/${plan.slug}` },
  }
}

export default async function PlanDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const plan = await getPlanBySlug(slug)
  if (!plan) notFound()

  const price = displayPriceUsd(plan)

  const specs: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: 'Region', value: plan.region?.name ?? '—' },
    { label: 'Network', value: plan.network ?? '—' },
    { label: 'Data', value: plan.data },
    { label: 'Validity', value: `${plan.days} days` },
    { label: 'Speed', value: plan.speed ?? '—' },
    { label: 'APN', value: plan.apn ?? '—', mono: true },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative pt-28 pb-12 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)', animation: 'pulse 6s ease-in-out infinite' }}
        />
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }} />
        <div className="relative z-10 max-w-[1000px] mx-auto px-6">
          <Link href="/browse" className="inline-flex items-center gap-1.5 text-[13px] text-secondary hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to all plans
          </Link>
          <div className="flex items-center gap-4">
            {plan.flag && <span className="text-[56px] leading-none">{plan.flag}</span>}
            <div>
              <h1 className="text-[32px] md:text-[40px] font-extrabold tracking-tight">{plan.name}</h1>
              <p className="text-[14px] text-secondary mt-1">
                {plan.country ?? plan.region?.name ?? 'Worldwide'}
                {plan.network ? ` · ${plan.network}` : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-[1000px] mx-auto px-6 pb-20 pt-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Details */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Specs */}
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Plan Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {specs.map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">{s.label}</p>
                  <p className={s.mono ? 'text-[14px] font-semibold font-mono' : 'text-[14px] font-semibold'}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fair usage */}
          {plan.fup && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-3">Fair Usage</p>
              <p className="text-[14px] text-secondary leading-relaxed">{plan.fup}</p>
            </div>
          )}

          {/* Destinations */}
          {plan.destinations.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">
                Destinations covered
              </p>
              <div className="flex flex-wrap gap-2">
                {plan.destinations.map((d) => (
                  <span
                    key={d.code}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-border text-[13px] text-secondary"
                  >
                    <Check size={12} className="text-accent-green" />
                    {d.flag ? `${d.flag} ` : ''}{d.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Purchase card */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Your Plan</p>

            <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
              <Row label="Data" value={plan.data} />
              <Row label="Validity" value={`${plan.days} days`} />
              {plan.speed && <Row label="Speed" value={plan.speed} />}
            </div>

            <div className="mb-5">
              <PriceDisplay usd={price} size="xl" suffix="/plan" />
            </div>

            <Link
              href={`/checkout?plan=${plan.slug}`}
              className="block w-full py-3.5 rounded-[12px] bg-gradient-btn text-white text-[15px] font-bold text-center transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)]"
            >
              Buy Now →
            </Link>
            <p className="text-[11px] text-muted text-center mt-3">Instant QR delivery · Refund if not activated</p>
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
