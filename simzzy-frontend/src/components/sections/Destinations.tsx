'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

const destinations = [
  { flag: '🇮🇳', name: 'India',    from: '$1.99' },
  { flag: '🇬🇧', name: 'UK',       from: '$3.99' },
  { flag: '🇺🇸', name: 'USA',      from: '$4.99' },
  { flag: '🇯🇵', name: 'Japan',    from: '$3.49' },
  { flag: '🇹🇭', name: 'Thailand', from: '$2.49' },
  { flag: '🇦🇪', name: 'UAE',      from: '$4.99' },
  { flag: '🇪🇺', name: 'Europe',   from: '$5.99' },
  { flag: '🌏', name: 'Global',    from: '$9.99' },
]

const delays = ['delay-1','delay-2','delay-3','delay-4','delay-5','delay-6','delay-1','delay-2'] as const

export default function Destinations() {
  const { ref, inView } = useInView()

  return (
    <section
      ref={ref}
      id="destinations"
      className="py-20"
    >
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <p className={cn('font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3', inView ? 'animate' : 'opacity-0')}>
          Destinations
        </p>
        <h2 className={cn('text-[36px] font-bold tracking-tight mb-3', inView ? 'animate delay-1' : 'opacity-0')}>
          Popular destinations
        </h2>
        <p className={cn('text-[15px] text-secondary mb-10', inView ? 'animate delay-2' : 'opacity-0')}>
          Choose from 200+ countries and regions worldwide
        </p>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {destinations.map((dest, i) => (
            <div
              key={dest.name}
              className={cn(
                'group relative bg-card border border-border rounded-[14px] p-5 text-center cursor-pointer transition-all duration-300 hover:bg-card-hover hover:border-border-hover hover:-translate-y-1 overflow-hidden',
                inView ? `animate ${delays[i]}` : 'opacity-0',
              )}
            >
              {/* Top gradient accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-btn opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="text-[36px] mb-2.5 block">{dest.flag}</span>
              <div className="text-sm font-semibold mb-1">{dest.name}</div>
              <div className="text-xs text-muted">
                From <b className="text-secondary font-semibold">{dest.from}</b>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/browse"
          className={cn(
            'inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-accent-pink transition-all duration-200 hover:gap-2.5',
            inView ? 'animate delay-3' : 'opacity-0',
          )}
        >
          View all 200+ destinations →
        </Link>
      </div>
    </section>
  )
}
