'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Smartphone } from 'lucide-react'

const SUPPORTED_DEVICES = [
  'iPhone XS / XR or newer',
  'Samsung Galaxy S20 or newer',
  'Samsung Galaxy Z Flip / Fold',
  'Google Pixel 3 or newer',
  'OnePlus 11 / 12',
  'Xiaomi 13 / 14',
  'iPad Pro / Air (Wi-Fi + Cellular)',
  'Motorola Razr (2019+)',
]

export default function DeviceCheckPage() {
  const [device, setDevice] = useState('')
  const checked = device !== ''

  return (
    <>
      {/* Hero */}
      <section className="relative pt-28 pb-12 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)', animation: 'pulse 6s ease-in-out infinite' }}
        />
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }} />
        <div className="relative z-10 max-w-[760px] mx-auto px-6 text-center">
          <p className="font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3">Compatibility</p>
          <h1 className="text-[34px] md:text-[44px] font-extrabold tracking-[-1.5px] mb-3">Is your phone eSIM ready?</h1>
          <p className="text-[15px] text-secondary">Check in two seconds — most phones from 2019 onward are supported.</p>
        </div>
      </section>

      <div className="max-w-[760px] mx-auto px-6 pb-20 pt-10 flex flex-col gap-6">
        {/* Quick checker */}
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
          <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Quick check</p>
          <label className="block text-[12px] font-semibold text-secondary mb-1.5">Select your device</label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="w-full bg-mid border border-border rounded-lg px-3 py-3 text-[14px] text-primary focus:outline-none focus:border-border-hover"
          >
            <option value="">Choose your phone…</option>
            {SUPPORTED_DEVICES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__other">Other / not listed</option>
          </select>

          {checked && (
            <div
              className="mt-4 flex items-start gap-3 rounded-xl p-4"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', animation: 'fadeIn 0.25s ease' }}
            >
              <Check className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-accent-green">
                  {device === '__other' ? 'Most likely supported' : 'Your device supports eSIM'}
                </p>
                <p className="text-[12px] text-secondary mt-0.5">
                  {device === '__other'
                    ? 'Confirm by dialing *#06# — if an EID number appears, you’re good to go.'
                    : 'You can buy and install a Simzzy eSIM right away.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Manual method */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={16} className="text-accent-purple" />
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">Manual check</p>
          </div>
          <ol className="flex flex-col gap-3">
            {[
              'Open your phone dialer and dial *#06#.',
              'Look for an EID number (32 digits) in the result.',
              'If an EID is shown, your phone supports eSIM.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold font-mono text-accent-pink flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,45,120,0.15), rgba(147,51,234,0.15))' }}
                >
                  {i + 1}
                </span>
                <p className="text-[14px] text-secondary leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Supported list */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Popular supported devices</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORTED_DEVICES.map((d) => (
              <div key={d} className="flex items-center gap-2 text-[13px] text-secondary">
                <Check size={14} className="text-accent-green flex-shrink-0" />
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/browse"
            className="flex-1 text-center py-3.5 rounded-xl bg-gradient-btn text-white text-[14px] font-bold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
          >
            Browse eSIM plans →
          </Link>
          <Link
            href="/support"
            className="flex-1 text-center py-3.5 rounded-xl border border-border-hover bg-card text-secondary text-[14px] font-semibold hover:bg-card-hover hover:text-primary transition-all"
          >
            Still unsure? Contact support
          </Link>
        </div>
      </div>
    </>
  )
}
