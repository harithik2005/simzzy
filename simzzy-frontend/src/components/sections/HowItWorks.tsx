'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

const steps = [
  {
    num: 'STEP 01',
    icon: '🔍',
    title: 'Choose your plan',
    desc: 'Search your destination and pick the data plan that fits your needs and budget.',
  },
  {
    num: 'STEP 02',
    icon: '💳',
    title: 'Pay & get QR code',
    desc: 'Complete payment securely. Get your eSIM QR code delivered instantly via email.',
  },
  {
    num: 'STEP 03',
    icon: '📱',
    title: 'Scan & connect',
    desc: 'Scan the QR code with your phone. Activate and start using mobile data immediately.',
  },
]

export default function HowItWorks() {
  const { ref, inView } = useInView()

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="py-20 bg-mid border-y border-border"
    >
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <p className={cn('font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3', inView ? 'animate' : 'opacity-0')}>
          How it works
        </p>
        <h2 className={cn('text-[36px] font-bold tracking-tight mb-3', inView ? 'animate delay-1' : 'opacity-0')}>
          Three steps to connect
        </h2>
        <p className={cn('text-[15px] text-secondary mb-10', inView ? 'animate delay-2' : 'opacity-0')}>
          Get online in under 2 minutes. No store visits, no waiting.
        </p>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={cn(
                'bg-card border border-border rounded-2xl p-8 text-center transition-all duration-300 hover:border-border-hover hover:bg-card-hover',
                inView ? `animate delay-${i + 2}` : 'opacity-0',
              )}
            >
              <p className="font-mono text-[11px] font-bold tracking-[2px] text-accent-pink mb-4">
                {step.num}
              </p>
              <div
                className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-4 text-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,45,120,0.15), rgba(147,51,234,0.15))' }}
              >
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-[13px] text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={cn('text-center mt-10', inView ? 'animate delay-5' : 'opacity-0')}>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 px-7 py-3.5 rounded-xl bg-gradient-btn text-white text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,45,120,0.3)]"
          >
            Start your order →
          </Link>
        </div>
      </div>
    </section>
  )
}
