'use client'

import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

const features = [
  { icon: '⚡', title: 'Instant delivery',  desc: 'Get your eSIM QR code within seconds after payment. No waiting, no shipping.' },
  { icon: '🛡️', title: 'Secure payments',   desc: 'All transactions encrypted and processed securely via EximPe.' },
  { icon: '💬', title: '24/7 AI support',   desc: 'Our smart chatbot is always available to help you with any questions.' },
  { icon: '🌍', title: '200+ countries',    desc: 'Coverage across the globe. One platform for all your travel data needs.' },
  { icon: '💰', title: 'No hidden fees',    desc: 'What you see is what you pay. Transparent pricing, no roaming surprises.' },
  { icon: '🔄', title: 'Easy top-up',       desc: 'Running low? Top up your data plan instantly without buying a new eSIM.' },
]

export default function Features() {
  const { ref, inView } = useInView()

  return (
    <section ref={ref} id="features" className="py-20">
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <p className={cn('font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3', inView ? 'animate' : 'opacity-0')}>
          Why Simzzy
        </p>
        <h2 className={cn('text-[36px] font-bold tracking-tight mb-3', inView ? 'animate delay-1' : 'opacity-0')}>
          Built for travelers
        </h2>
        <p className={cn('text-[15px] text-secondary mb-10', inView ? 'animate delay-2' : 'opacity-0')}>
          Everything you need for seamless connectivity abroad
        </p>

        {/* 3×2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                'bg-card border border-border rounded-[14px] p-6 transition-all duration-300 hover:border-border-hover hover:bg-card-hover',
                inView ? `animate delay-${i + 1}` : 'opacity-0',
              )}
            >
              <span className="text-2xl mb-3.5 block">{f.icon}</span>
              <h3 className="text-[15px] font-semibold mb-1.5">{f.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
