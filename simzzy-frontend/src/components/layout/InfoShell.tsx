import Link from 'next/link'

/** Shared hero + content shell for static info/legal pages. */
export function InfoShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <>
      <section className="relative pt-28 pb-12 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)', animation: 'pulse 6s ease-in-out infinite' }}
        />
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }} />
        <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center">
          <p className="font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3">{eyebrow}</p>
          <h1 className="text-[34px] md:text-[44px] font-extrabold tracking-[-1.5px] mb-3">{title}</h1>
          {subtitle && <p className="text-[15px] text-secondary max-w-[560px] mx-auto">{subtitle}</p>}
        </div>
      </section>

      <div className="max-w-[800px] mx-auto px-6 pb-20 pt-10 flex flex-col gap-5">{children}</div>
    </>
  )
}

/** A titled card block for info-page sections. */
export function InfoSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6">
      <h2 className="text-[16px] font-bold mb-2.5">{heading}</h2>
      <div className="text-[14px] text-secondary leading-relaxed flex flex-col gap-3">{children}</div>
    </section>
  )
}

/** Inline "still need help" footer used across legal pages. */
export function InfoHelpNote() {
  return (
    <p className="text-[13px] text-muted text-center">
      Questions about this page?{' '}
      <Link href="/contact" className="text-accent-pink font-semibold hover:underline">
        Contact us
      </Link>
      .
    </p>
  )
}
