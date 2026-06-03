'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'
import { reviews } from '@/data/reviews'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const featured = reviews.slice(0, 3)

export default function Reviews() {
  const { ref, inView } = useInView()

  return (
    <section ref={ref} id="reviews" className="py-20 bg-mid border-y border-border">
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <p className={cn('font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3', inView ? 'animate' : 'opacity-0')}>
          Reviews
        </p>
        <h2 className={cn('text-[36px] font-bold tracking-tight mb-3', inView ? 'animate delay-1' : 'opacity-0')}>
          What travelers say
        </h2>
        <p className={cn('text-[15px] text-secondary mb-10', inView ? 'animate delay-2' : 'opacity-0')}>
          Real reviews from real users around the world
        </p>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featured.map((review, i) => (
            <div
              key={review.id}
              className={cn(
                'bg-card border border-border rounded-[14px] p-6 transition-all duration-300 hover:border-border-hover',
                inView ? `animate delay-${i + 2}` : 'opacity-0',
              )}
            >
              {/* Stars */}
              <div className="text-yellow-400 text-sm tracking-[2px] mb-3.5">
                {'★'.repeat(review.rating)}
              </div>

              {/* Review text */}
              <p className="text-sm text-secondary leading-relaxed mb-4 italic">
                &ldquo;{review.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ff2d78, #9333ea)' }}
                >
                  {initials(review.name)}
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{review.name}</div>
                  <div className="text-[11px] text-muted">{review.country} {review.flag}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={cn('text-center mt-9', inView ? 'animate delay-5' : 'opacity-0')}>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 px-7 py-3 rounded-xl bg-gradient-btn text-white text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,45,120,0.3)]"
          >
            Browse plans loved by travelers →
          </Link>
        </div>
      </div>
    </section>
  )
}
