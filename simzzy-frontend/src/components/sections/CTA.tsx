'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

export default function CTA() {
  const { ref, inView } = useInView()

  return (
    <section ref={ref} id="cta" className="py-[100px] text-center relative overflow-hidden">
      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-[1100px] mx-auto px-6">
        <h2
          className={cn(
            'text-[30px] md:text-[42px] font-extrabold tracking-[-1.5px] mb-3.5',
            inView ? 'animate' : 'opacity-0',
          )}
        >
          Ready to explore<br />the world?
        </h2>
        <p
          className={cn(
            'text-base text-secondary mb-8',
            inView ? 'animate delay-1' : 'opacity-0',
          )}
        >
          Get connected in 200+ countries with instant eSIM delivery
        </p>
        <Link
          href="/browse"
          className={cn(
            'inline-flex px-10 py-4 rounded-xl bg-gradient-btn text-white text-base font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,45,120,0.3)]',
            inView ? 'animate delay-2' : 'opacity-0',
          )}
        >
          Browse eSIM Plans →
        </Link>
      </div>
    </section>
  )
}
