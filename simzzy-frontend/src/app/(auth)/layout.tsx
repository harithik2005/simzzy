import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Simzzy or create an account to manage your eSIMs and orders.',
}

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal navbar */}
      <header
        className="fixed top-0 inset-x-0 z-50 border-b border-border h-16"
        style={{
          background: 'rgba(10,0,24,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-gradient text-2xl font-bold tracking-tight"
          >
            Simzzy
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      {/* Split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 pt-16">
        {/* Left: form side */}
        <div className="relative flex items-center justify-center px-6 py-12 lg:py-16 overflow-hidden">
          {/* Subtle gradient glow behind the card */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(147,51,234,0.18) 0%, transparent 70%)',
              animation: 'pulse 7s ease-in-out infinite',
            }}
          />
          <div className="relative z-10 w-full flex justify-center">
            {children}
          </div>
        </div>

        {/* Right: branding panel — desktop only */}
        <BrandingPanel />
      </div>
    </div>
  )
}

function BrandingPanel() {
  const points = [
    { icon: '🌍', text: '200+ countries covered' },
    { icon: '⚡', text: 'Instant QR activation' },
    { icon: '💬', text: '24/7 AI-powered support' },
  ]

  return (
    <div
      className="hidden lg:flex relative overflow-hidden items-center justify-center"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(147,51,234,0.35) 0%, transparent 60%)',
          animation: 'pulse 6s ease-in-out infinite',
        }}
      />

      {/* Noise grain accent */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 80%, rgba(255,45,120,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(124,58,237,0.15) 0%, transparent 40%)',
        }}
      />

      <div className="relative z-10 max-w-md px-12 text-center">
        {/* Big logo */}
        <div
          className="text-[64px] font-extrabold tracking-[-2px] mb-4 text-gradient inline-block"
          style={{ animation: 'fadeUp 0.6s ease 0.1s both' }}
        >
          Simzzy
        </div>

        {/* Tagline */}
        <p
          className="text-[18px] font-medium text-primary mb-3 leading-snug"
          style={{ animation: 'fadeUp 0.6s ease 0.2s both' }}
        >
          Stay connected
          <br />
          anywhere you go
        </p>
        <p
          className="text-[13px] text-secondary mb-10"
          style={{ animation: 'fadeUp 0.6s ease 0.3s both' }}
        >
          The global eSIM trusted by 500,000+ travelers
        </p>

        {/* Trust points */}
        <div className="flex flex-col gap-3">
          {points.map((p, i) => (
            <div
              key={p.text}
              className="flex items-center gap-3 px-5 py-4 rounded-[14px] bg-white/[0.04] border border-border backdrop-blur-sm text-left"
              style={{
                animation: `fadeUp 0.6s ease ${0.4 + i * 0.1}s both, float 4s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <span className="text-[22px]">{p.icon}</span>
              <span className="text-[13px] font-medium text-primary">{p.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
