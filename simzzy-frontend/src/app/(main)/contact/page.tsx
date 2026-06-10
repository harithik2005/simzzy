'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, MessageCircle, MapPin, LifeBuoy } from 'lucide-react'
import { toast } from '@/store/toast'
import { COMPANY } from '@/lib/constants'

const INPUT =
  'w-full bg-mid border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover'
const LABEL = 'block text-[12px] font-semibold text-secondary mb-1.5'

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const valid = name.trim().length >= 2 && isValidEmail(email) && message.trim().length >= 10

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) {
      toast.error('Please complete the form', 'Add your name, a valid email, and a short message')
      return
    }
    toast.success('Message sent', 'Our team will reply within 24 hours')
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <>
      <section className="relative pt-28 pb-12 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)', animation: 'pulse 6s ease-in-out infinite' }}
        />
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }} />
        <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center">
          <p className="font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3">Contact</p>
          <h1 className="text-[34px] md:text-[44px] font-extrabold tracking-[-1.5px] mb-3">Get in touch</h1>
          <p className="text-[15px] text-secondary">We&apos;re here 24/7. Send a message or reach us directly.</p>
        </div>
      </section>

      <div className="max-w-[900px] mx-auto px-6 pb-20 pt-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Form */}
        <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col gap-4">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
          <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">Send a message</p>
          <div>
            <label className={LABEL}>Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="How can we help?"
              className={`${INPUT} resize-none`}
            />
          </div>
          <button
            type="submit"
            className="py-3 rounded-[12px] bg-gradient-btn text-white text-[14px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all"
          >
            Send message
          </button>
        </form>

        {/* Methods */}
        <div className="flex flex-col gap-3">
          <ContactMethod icon={MessageCircle} title="AI Support" desc="Open the chat widget for instant help, 24/7." />
          <ContactMethod icon={Mail} title="Email" desc={COMPANY.supportEmail} href={`mailto:${COMPANY.supportEmail}`} />
          <ContactMethod icon={MapPin} title="Registered office" desc={`${COMPANY.name}, ${COMPANY.addressInline}`} />
          <ContactMethod icon={LifeBuoy} title="Help Center" desc="Browse FAQs and guides." href="/support" />
        </div>
      </div>
    </>
  )
}

function ContactMethod({
  icon: Icon,
  title,
  desc,
  href,
}: {
  icon: typeof Mail
  title: string
  desc: string
  href?: string
}) {
  const inner = (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-border-hover transition-colors">
      <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent-purple/12 text-accent-purple mb-3">
        <Icon size={16} />
      </span>
      <p className="text-[14px] font-bold mb-0.5">{title}</p>
      <p className="text-[12px] text-secondary break-all">{desc}</p>
    </div>
  )
  if (!href) return inner
  if (href.startsWith('/')) return <Link href={href}>{inner}</Link>
  return <a href={href}>{inner}</a>
}
