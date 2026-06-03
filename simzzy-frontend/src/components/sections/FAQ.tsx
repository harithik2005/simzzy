'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

const faqs = [
  {
    q: 'What is an eSIM?',
    a: 'An eSIM is a digital SIM embedded in your device. It lets you activate a mobile data plan without a physical SIM card. Just scan a QR code and you\'re connected.',
  },
  {
    q: 'How do I install the eSIM?',
    a: 'After purchase, you\'ll receive a QR code via email. Go to your phone\'s Settings → Cellular → Add eSIM → Scan QR Code. It takes less than a minute.',
  },
  {
    q: 'Which devices support eSIM?',
    a: 'Most modern smartphones including iPhone XS and newer, Samsung Galaxy S20+, Google Pixel 3+, OnePlus, and many more. Use our device checker tool to verify compatibility.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes, if the eSIM hasn\'t been activated, you can request a full refund. Once activated, the plan is non-refundable. Contact our support for assistance.',
  },
  {
    q: 'When does the plan start?',
    a: 'Your data plan begins when you connect to a network at your destination. You can install the eSIM before your trip and activate it when you arrive.',
  },
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const { ref, inView } = useInView()

  return (
    <section ref={ref} id="support" className="py-20">
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Centered header */}
        <div className="text-center mb-10">
          <p className={cn('font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3', inView ? 'animate' : 'opacity-0')}>
            FAQ
          </p>
          <h2 className={cn('text-[36px] font-bold tracking-tight mb-3', inView ? 'animate delay-1' : 'opacity-0')}>
            Common questions
          </h2>
          <p className={cn('text-[15px] text-secondary', inView ? 'animate delay-2' : 'opacity-0')}>
            Quick answers to get you started
          </p>
        </div>

        {/* Accordion */}
        <div className="max-w-[700px] mx-auto flex flex-col gap-2">
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i
            return (
              <div
                key={i}
                className={cn(
                  'bg-card border rounded-xl overflow-hidden transition-colors duration-300',
                  isOpen ? 'border-border-hover' : 'border-border hover:border-border-hover',
                  inView ? `animate delay-${Math.min(i + 2, 6)}` : 'opacity-0',
                )}
              >
                {/* Question */}
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-[18px] text-sm font-semibold text-left gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-muted shrink-0 transition-transform duration-300',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {/* Answer — max-height transition for smooth open/close */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? '200px' : '0' }}
                >
                  <p className="px-5 pb-[18px] text-[13px] text-secondary leading-[1.7]">
                    {faq.a}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chat CTA */}
        <p className={cn('text-center mt-7 text-sm text-muted', inView ? 'animate delay-6' : 'opacity-0')}>
          Have more questions?{' '}
          <Link href="/support" className="text-accent-pink font-semibold hover:underline">
            Chat with our AI support →
          </Link>
        </p>
      </div>
    </section>
  )
}
