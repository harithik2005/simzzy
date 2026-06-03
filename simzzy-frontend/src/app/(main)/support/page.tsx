'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle, Mail, Search, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import TicketCenter from '@/components/support/TicketCenter'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Category {
  id: string
  icon: string
  title: string
  desc: string
}

interface FAQ {
  q: string
  a: string
}

interface HelpSection {
  id: string
  title: string
  faqs: FAQ[]
}

/* ─── Data ───────────────────────────────────────────────────────────────── */

const CATEGORIES: Category[] = [
  { id: 'getting-started', icon: '📱', title: 'Getting Started', desc: 'How to buy and install your first eSIM' },
  { id: 'installation', icon: '🔧', title: 'Installation Help', desc: 'Step-by-step guides for iPhone and Android' },
  { id: 'payments', icon: '💳', title: 'Payments & Billing', desc: 'Payment methods, invoices, and refunds' },
  { id: 'coverage', icon: '🌍', title: 'Coverage & Plans', desc: 'Check coverage, data plans, and top-ups' },
  { id: 'usage', icon: '📊', title: 'Usage & Data', desc: 'Monitor your data usage and remaining balance' },
  { id: 'account', icon: '⚙️', title: 'Account & Settings', desc: 'Manage your profile, password, and preferences' },
]

const SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    faqs: [
      {
        q: 'What is an eSIM?',
        a: "An eSIM is a digital SIM embedded in your device — no physical card needed. Activate a mobile data plan by scanning a QR code, and you're connected.",
      },
      {
        q: 'How do I buy an eSIM?',
        a: 'Browse plans, select your destination country, complete checkout, and receive your QR code via email within seconds.',
      },
      {
        q: 'Which countries are available?',
        a: 'We cover 200+ countries across Asia, Europe, Americas, Middle East, Africa, and Oceania. Check our Browse page for the full list.',
      },
      {
        q: 'Do I need an account?',
        a: 'Optional. You can buy as a guest using just your email. Creating an account lets you track orders and manage all your eSIMs in one place.',
      },
    ],
  },
  {
    id: 'installation',
    title: 'Installation Help',
    faqs: [
      {
        q: 'How to install on iPhone?',
        a: 'Go to Settings → Cellular → Add eSIM → Scan QR Code. Point your camera at the QR code from our email and follow the prompts.',
      },
      {
        q: 'How to install on Android?',
        a: 'Go to Settings → Connections → SIM Manager → Add eSIM → Scan QR. Steps may vary slightly by manufacturer (Samsung, Pixel, OnePlus, etc.).',
      },
      {
        q: 'Can I install before my trip?',
        a: 'Yes, install anytime before you travel. The data plan only starts counting down when you first connect to a network at your destination.',
      },
      {
        q: 'QR code not scanning?',
        a: "Try opening the email on another device and scanning from there, or use the manual activation code included in your order email.",
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Billing',
    faqs: [
      {
        q: 'What payment methods do you accept?',
        a: 'Credit and debit cards (Visa, Mastercard, Rupay), UPI (GPay, PhonePe, Paytm, BHIM), Net Banking, and digital wallets — all processed securely via EximPe.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Yes. All transactions use 256-bit SSL encryption and are processed by PCI-DSS compliant payment processors. We never store your card details.',
      },
      {
        q: 'How do I get a refund?',
        a: 'Contact support with your order ID. Full refund available if the eSIM has not been activated. See our Refund Policy for full details.',
      },
      {
        q: "Where's my invoice?",
        a: 'Your invoice is automatically emailed after purchase. You can also download it anytime from Dashboard → My Orders.',
      },
    ],
  },
  {
    id: 'coverage',
    title: 'Coverage & Plans',
    faqs: [
      {
        q: 'How do I check coverage?',
        a: 'Visit our Browse page and select a country to see all available networks, supported speeds (4G/5G), and plan options.',
      },
      {
        q: 'Can I top up my plan?',
        a: 'Yes, you can purchase additional data top-ups for active eSIMs directly from your Dashboard. No need to install a new eSIM.',
      },
      {
        q: 'Do plans include calls/SMS?',
        a: 'Most plans are data-only and use VoIP apps like WhatsApp or FaceTime for calls. Some regional plans include local calls and SMS — check the plan details.',
      },
    ],
  },
  {
    id: 'usage',
    title: 'Usage & Data',
    faqs: [
      {
        q: 'How do I check remaining data?',
        a: 'Go to Dashboard → My eSIMs to see real-time data usage and days remaining for each active plan.',
      },
      {
        q: 'What happens when data runs out?',
        a: 'Your connection will stop. You can purchase a top-up from your Dashboard to continue, or buy a new plan if your current one has expired.',
      },
      {
        q: 'Why is my speed slow?',
        a: "You may have hit your fair usage policy limit, or be in an area with weak signal. Check the plan's FUP details and try moving to a stronger coverage area.",
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Settings',
    faqs: [
      {
        q: 'How to change my password?',
        a: 'Go to Dashboard → Profile → Change Password. Enter your current password and a new one (minimum 8 characters).',
      },
      {
        q: 'How to delete my account?',
        a: 'Go to Dashboard → Profile → Delete Account. All your data will be permanently removed within 30 days, per our Privacy Policy.',
      },
      {
        q: 'I forgot my password.',
        a: 'Use the Forgot Password page to receive a reset link via email. The link expires after 30 minutes for security.',
      },
    ],
  },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function matchesQuery(faq: FAQ, q: string) {
  if (!q) return true
  const lower = q.toLowerCase()
  return faq.q.toLowerCase().includes(lower) || faq.a.toLowerCase().includes(lower)
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top, behavior: 'smooth' })
}

/* ─── FAQ Accordion ──────────────────────────────────────────────────────── */

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQ
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={cn(
        'bg-card border rounded-xl overflow-hidden transition-colors duration-300',
        isOpen ? 'border-border-hover' : 'border-border hover:border-border-hover',
      )}
    >
      <button
        onClick={onToggle}
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
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? '300px' : '0' }}
      >
        <p className="px-5 pb-[18px] text-[13px] text-secondary leading-[1.7]">{faq.a}</p>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SupportPage() {
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter sections based on search query
  const visibleSections = useMemo(() => {
    if (!query.trim()) return SECTIONS
    return SECTIONS.map((section) => ({
      ...section,
      faqs: section.faqs.filter((faq) => matchesQuery(faq, query)),
    })).filter((section) => section.faqs.length > 0)
  }, [query])

  const totalMatches = visibleSections.reduce((sum, s) => sum + s.faqs.length, 0)

  return (
    <>
      {/* ── Hero ── */}
      <section
        className="relative pt-28 pb-14 overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)',
            animation: 'pulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }}
        />

        <div className="relative z-10 max-w-[750px] mx-auto px-6 text-center">
          <h1
            className="animate delay-1 text-[36px] md:text-[44px] font-extrabold tracking-[-1.5px] mb-3"
            style={{
              background: 'linear-gradient(180deg, #fff 0%, #c8b0e8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            How can we help?
          </h1>
          <p className="animate delay-2 text-[15px] text-secondary mb-7">
            Get instant answers from our AI chatbot or browse help topics
          </p>

          {/* Search */}
          <div className="animate delay-3 relative max-w-[560px] mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-5 py-4 text-[15px] rounded-[14px] outline-none transition-all duration-300 text-primary placeholder:text-muted border border-[rgba(255,255,255,0.12)] bg-white/[0.06] focus:border-accent-purple focus:bg-white/[0.08] focus:shadow-[0_0_30px_rgba(147,51,234,0.15)]"
              style={{ backdropFilter: 'blur(10px)' }}
            />
          </div>

          {query.trim() && (
            <p className="mt-3 text-[12px] text-muted">
              {totalMatches === 0
                ? 'No results found. Try a different search term.'
                : `Found ${totalMatches} ${totalMatches === 1 ? 'answer' : 'answers'}`}
            </p>
          )}
        </div>
      </section>

      {/* ── Quick help categories ── */}
      {!query.trim() && (
        <section className="max-w-[1100px] mx-auto px-6 pt-14">
          <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5 text-center">
            Browse by topic
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToSection(cat.id)}
                className="group text-left bg-card border border-border rounded-[14px] p-5 relative overflow-hidden transition-all duration-300 hover:border-border-hover hover:bg-card-hover hover:-translate-y-1"
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-[28px] mb-3">{cat.icon}</div>
                <h3 className="text-[15px] font-bold mb-1.5">{cat.title}</h3>
                <p className="text-[12px] text-muted leading-relaxed mb-3">{cat.desc}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-accent-pink font-semibold uppercase tracking-[1px] group-hover:gap-2 transition-all duration-200">
                  Learn more <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Help sections ── */}
      <section className="max-w-[800px] mx-auto px-6 pt-16 pb-16">
        {visibleSections.length === 0 ? (
          <div className="bg-card border border-border rounded-[14px] p-12 text-center">
            <p className="text-[40px] mb-3">🔍</p>
            <p className="text-[16px] font-semibold mb-2">No matching answers</p>
            <p className="text-[13px] text-muted">
              Try a different search term, or contact support below.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {visibleSections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                style={{ scrollMarginTop: '80px' }}
              >
                <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">
                  {section.title}
                </p>
                <div className="flex flex-col gap-2">
                  {section.faqs.map((faq, i) => {
                    const id = `${section.id}-${i}`
                    return (
                      <FAQItem
                        key={id}
                        faq={faq}
                        isOpen={openIds.has(id)}
                        onToggle={() => toggle(id)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Ticket Center (authenticated users only) ── */}
      <TicketCenter />

      {/* ── Contact section ── */}
      <section className="bg-mid border-t border-border py-20">
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-3">
            Contact
          </p>
          <h2 className="text-[28px] md:text-[34px] font-extrabold tracking-[-1px] mb-3">
            Still need help?
          </h2>
          <p className="text-[14px] text-secondary mb-10">
            Our team is here for you 24/7
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[700px] mx-auto">
            {/* Chat with AI */}
            <div className="bg-card border border-border rounded-[14px] p-7 relative overflow-hidden transition-all duration-300 hover:border-border-hover">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] mx-auto mb-4"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,45,120,0.15), rgba(147,51,234,0.15))',
                  border: '1px solid rgba(147,51,234,0.25)',
                }}
              >
                💬
              </div>
              <h3 className="text-[16px] font-bold mb-2">Chat with AI</h3>
              <p className="text-[12px] text-muted leading-relaxed mb-5">
                Get instant answers from our smart chatbot, trained on every product detail.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('simzzy:open-chat'))}
                className="w-full py-3 rounded-[12px] bg-gradient-btn text-white text-[13px] font-bold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)] inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
              </button>
            </div>

            {/* Email */}
            <div className="bg-card border border-border rounded-[14px] p-7 relative overflow-hidden transition-all duration-300 hover:border-border-hover">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-50" />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px] mx-auto mb-4"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}
              >
                ✉️
              </div>
              <h3 className="text-[16px] font-bold mb-2">Email Us</h3>
              <p className="text-[12px] text-muted leading-relaxed mb-3">
                We&apos;ll respond within 24 hours.
              </p>
              <p className="text-[13px] text-accent-green font-mono font-semibold mb-5">
                support@simzzy.com
              </p>
              <a
                href="mailto:support@simzzy.com"
                className="block w-full py-3 rounded-[12px] border border-border-hover bg-card text-secondary text-[13px] font-bold transition-all duration-200 hover:bg-card-hover hover:text-primary inline-flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
            </div>
          </div>

          <p className="mt-8 text-[12px] text-muted">
            Looking for something else?{' '}
            <Link href="/" className="text-accent-pink font-semibold hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
