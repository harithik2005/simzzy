'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/context/currency'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { toast } from '@/store/toast'
import {
  fetchPlanBySlug,
  fetchPlans,
  displayPriceUsd,
  type PlanDetailDto,
} from '@/lib/plan-client'
import { createOrder as apiCreateOrder, payOrder } from '@/lib/order-client'

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Step = 1 | 2 | 3

type Order = {
  plan: PlanDetailDto
  /** Real order id from the backend once created; null until then. */
  orderId: string | null
  /** Display order number (SIM-…) shown on the confirmation screen. */
  orderNumber: string
}

/* ─── Static data ────────────────────────────────────────────────────────── */

const VALID_PROMO = 'TRAVEL10'

// Sandbox card credentials — mirrors the backend FakePaymentProvider TEST_CARD.
// Kept as a plain client constant so the checkout bundle never imports server code.
const TEST_CARD_DISPLAY = {
  number: '1234 4321 1234 4321',
  name: 'SIMZZY',
  expiry: '12/30',
  cvv: '009',
}

// TEST MODE is on for every provider except a live Cashfree integration.
const TEST_MODE = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'fake') !== 'cashfree'

const DIAL_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

const TRUST_BADGES = [
  { icon: '⚡', text: 'Instant QR code delivery' },
  { icon: '🔒', text: '256-bit SSL encryption' },
  { icon: '💬', text: '24/7 AI support' },
  { icon: '↩️', text: 'Refund if not activated' },
]

/* ─── Pricing helper ─────────────────────────────────────────────────────── */

function computeTotals(subtotalUsd: number, promoApplied: boolean) {
  const discount = promoApplied ? +(subtotalUsd * 0.1).toFixed(2) : 0
  const tax = 0
  const total = +(subtotalUsd - discount + tax).toFixed(2)
  return { subtotal: subtotalUsd, discount, tax, total }
}

/* ─── Shared input class ─────────────────────────────────────────────────── */

const INPUT_BASE =
  'w-full px-4 py-3.5 text-sm rounded-[14px] outline-none transition-all duration-300 bg-white/[0.04] text-primary placeholder:text-muted border border-border focus:border-accent-purple focus:bg-white/[0.06] focus:shadow-[0_0_20px_rgba(147,51,234,0.1)]'

/* ─── Mini phone styles (inline — matches DeviceCheck proportions) ─────── */

const MINI_PHONE: React.CSSProperties = {
  width: 110,
  height: 210,
  borderRadius: 22,
  background: 'linear-gradient(175deg, #120025 0%, #070012 100%)',
  border: '2px solid rgba(255,255,255,0.14)',
  padding: 6,
  position: 'relative',
  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  flexShrink: 0,
}

const MINI_SCREEN: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 16,
  background: '#0c0024',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const MINI_NOTCH: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 46,
  height: 11,
  borderRadius: '0 0 7px 7px',
  background: '#070012',
  border: '2px solid rgba(255,255,255,0.1)',
  borderTop: 'none',
  zIndex: 10,
}

const MINI_STATUS: React.CSSProperties = {
  paddingTop: 16,
  paddingBottom: 3,
  paddingLeft: 8,
  paddingRight: 8,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const MINI_STATUS_TEXT: React.CSSProperties = {
  fontSize: 6,
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'monospace',
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function MiniDialPhone() {
  return (
    <div>
      <div style={MINI_PHONE}>
        <div style={MINI_NOTCH} />
        <div style={MINI_SCREEN}>
          <div style={MINI_STATUS}>
            <span style={MINI_STATUS_TEXT}>9:41</span>
            <span style={MINI_STATUS_TEXT}>●●●</span>
          </div>
          <div
            style={{
              margin: '3px 7px 4px',
              padding: '5px 7px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 7,
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              letterSpacing: 2,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            *#06#
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4,
              padding: '0 7px',
              flex: 1,
              alignContent: 'start',
            }}
          >
            {DIAL_ROWS.map((row) =>
              row.map((key) => (
                <div
                  key={key}
                  style={{
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    background:
                      key === '*' || key === '#'
                        ? 'rgba(147,51,234,0.14)'
                        : 'rgba(255,255,255,0.05)',
                    border:
                      key === '*' || key === '#'
                        ? '1px solid rgba(147,51,234,0.25)'
                        : '1px solid rgba(255,255,255,0.06)',
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      key === '*' || key === '#'
                        ? '#9333ea'
                        : 'rgba(255,255,255,0.85)',
                  }}
                >
                  {key}
                </div>
              )),
            )}
          </div>
          <div style={{ padding: '4px 7px 8px' }}>
            <div
              style={{
                height: 20,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
              }}
            >
              📞
            </div>
          </div>
        </div>
      </div>
      <p
        style={{
          marginTop: 7,
          textAlign: 'center',
          fontSize: 8,
          fontFamily: 'monospace',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#7a5ea0',
          fontWeight: 700,
        }}
      >
        Dial *#06#
      </p>
    </div>
  )
}

function MiniResultPhone() {
  return (
    <div>
      <div style={MINI_PHONE}>
        <div style={MINI_NOTCH} />
        <div style={MINI_SCREEN}>
          <div style={MINI_STATUS}>
            <span style={MINI_STATUS_TEXT}>9:41</span>
            <span style={MINI_STATUS_TEXT}>●●●</span>
          </div>
          <div style={{ padding: '2px 7px 4px' }}>
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.75)',
                marginBottom: 4,
              }}
            >
              Device Info
            </p>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>
          <div
            style={{
              margin: '0 6px 4px',
              padding: '6px 7px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.32)',
              borderRadius: 7,
            }}
          >
            <div
              style={{
                fontSize: 7,
                fontWeight: 700,
                color: '#22c55e',
                marginBottom: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span>✓</span> EID
            </div>
            <p
              style={{
                fontSize: 7,
                color: '#b8a0d8',
                fontFamily: 'monospace',
                letterSpacing: 1.5,
              }}
            >
              ••••••••••••
            </p>
          </div>
          {(['IMEI', 'IMEI2', 'MEID'] as const).map((label) => (
            <div
              key={label}
              style={{
                margin: '0 6px 3px',
                padding: '4px 7px',
                background: 'rgba(255,45,120,0.05)',
                border: '1px solid rgba(255,45,120,0.12)',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 7, color: '#ff2d78', fontWeight: 700 }}>✗</span>
              <span
                style={{
                  fontSize: 6,
                  color: 'rgba(255,255,255,0.28)',
                  textDecoration: 'line-through',
                  textDecorationColor: '#ff2d78',
                }}
              >
                Not {label}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.18)',
              }}
            />
          </div>
        </div>
      </div>
      <p
        style={{
          marginTop: 7,
          textAlign: 'center',
          fontSize: 8,
          fontFamily: 'monospace',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#22c55e',
          fontWeight: 700,
        }}
      >
        EID = eSIM ✓
      </p>
    </div>
  )
}

function QRCodeSVG() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width={140} height={140}>
      <rect width="100" height="100" fill="#fff" />
      <g fill="#1a0040">
        <rect x="5" y="5" width="25" height="25" rx="3" />
        <rect x="70" y="5" width="25" height="25" rx="3" />
        <rect x="5" y="70" width="25" height="25" rx="3" />
        <rect x="10" y="10" width="15" height="15" rx="2" fill="#fff" />
        <rect x="75" y="10" width="15" height="15" rx="2" fill="#fff" />
        <rect x="10" y="75" width="15" height="15" rx="2" fill="#fff" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="79" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="79" width="7" height="7" rx="1" />
        <rect x="35" y="5" width="5" height="5" />
        <rect x="45" y="5" width="5" height="5" />
        <rect x="55" y="5" width="5" height="5" />
        <rect x="35" y="15" width="5" height="5" />
        <rect x="50" y="12" width="5" height="5" />
        <rect x="35" y="25" width="5" height="5" />
        <rect x="45" y="22" width="5" height="5" />
        <rect x="55" y="18" width="5" height="5" />
        <rect x="60" y="28" width="5" height="5" />
        <rect x="5" y="35" width="5" height="5" />
        <rect x="15" y="40" width="5" height="5" />
        <rect x="25" y="35" width="5" height="5" />
        <rect x="5" y="50" width="5" height="5" />
        <rect x="18" y="52" width="5" height="5" />
        <rect x="5" y="60" width="5" height="5" />
        <rect x="28" y="58" width="5" height="5" />
        <rect x="35" y="35" width="5" height="5" />
        <rect x="42" y="40" width="5" height="5" />
        <rect x="50" y="35" width="5" height="5" />
        <rect x="58" y="42" width="5" height="5" />
        <rect x="35" y="50" width="5" height="5" />
        <rect x="48" y="52" width="5" height="5" />
        <rect x="55" y="55" width="5" height="5" />
        <rect x="38" y="58" width="5" height="5" />
        <rect x="45" y="62" width="5" height="5" />
        <rect x="62" y="60" width="5" height="5" />
        <rect x="72" y="35" width="5" height="5" />
        <rect x="80" y="40" width="5" height="5" />
        <rect x="90" y="38" width="5" height="5" />
        <rect x="70" y="48" width="5" height="5" />
        <rect x="82" y="52" width="5" height="5" />
        <rect x="90" y="55" width="5" height="5" />
        <rect x="75" y="60" width="5" height="5" />
        <rect x="85" y="65" width="5" height="5" />
        <rect x="70" y="72" width="25" height="23" rx="3" fill="none" stroke="#1a0040" strokeWidth="2" />
        <rect x="78" y="80" width="9" height="9" rx="1" />
        <rect x="38" y="72" width="5" height="5" />
        <rect x="50" y="75" width="5" height="5" />
        <rect x="58" y="80" width="5" height="5" />
        <rect x="42" y="85" width="5" height="5" />
        <rect x="55" y="90" width="5" height="5" />
        <rect x="35" y="90" width="5" height="5" />
        <rect x="48" y="88" width="5" height="5" />
        <rect x="60" y="70" width="5" height="5" />
      </g>
    </svg>
  )
}

/* ─── Progress Bar ───────────────────────────────────────────────────────── */

function ProgressBar({ step }: { step: Step }) {
  const labels = ['Details', 'Payment', 'Confirmation']
  return (
    <div className="flex items-center justify-center">
      {labels.map((label, i) => {
        const num = i + 1
        const isDone = step > num
        const isActive = step === num
        return (
          <div key={label} className="flex items-center">
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300',
                  isDone && 'border-accent-green text-accent-green bg-[rgba(34,197,94,0.1)]',
                  isActive && 'border-accent-purple text-primary bg-[rgba(147,51,234,0.15)]',
                  !isDone && !isActive && 'border-border text-muted bg-deep',
                )}
              >
                {isDone ? '✓' : num}
              </div>
              <span
                className={cn(
                  'absolute top-12 text-[10px] font-medium whitespace-nowrap transition-colors duration-300',
                  isDone && 'text-accent-green',
                  isActive && 'text-secondary',
                  !isDone && !isActive && 'text-muted',
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div
                className={cn(
                  'w-[70px] h-0.5 transition-all duration-300',
                  step > i + 1 && 'bg-accent-green',
                  step === i + 1 && 'bg-accent-purple',
                  step <= i + 1 && step !== i + 1 && 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Order Summary (reused in steps 1 and 2) ───────────────────────────── */

function OrderSummary({
  order,
  promoApplied,
  email,
  showEmail = false,
}: {
  order: Order
  promoApplied: boolean
  email?: string
  showEmail?: boolean
}) {
  const { format } = useCurrency()
  const { plan } = order
  const { subtotal, discount, tax, total } = computeTotals(displayPriceUsd(plan), promoApplied)

  return (
    <div className="bg-card border border-border rounded-[14px] p-7 relative overflow-hidden lg:sticky lg:top-20 self-start">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5">
        Order Summary
      </p>

      {/* Plan */}
      <div className="flex gap-3 items-start pb-4 border-b border-border mb-4">
        {plan.flag && <span className="text-[42px] leading-none">{plan.flag}</span>}
        <div>
          <h3 className="text-[17px] font-bold">{plan.name}</h3>
          <p className="text-[11px] text-muted">{plan.network ?? '—'} · {plan.speed ?? '—'}</p>
        </div>
      </div>

      {/* Specs */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Data</span>
          <span className="font-medium">{plan.data}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Validity</span>
          <span className="font-medium">{plan.days} days</span>
        </div>
        {plan.speed && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Speed</span>
            <span className="font-medium">{plan.speed}</span>
          </div>
        )}
        {showEmail && email ? (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Email</span>
            <span className="font-medium text-accent-green truncate max-w-[160px]">{email}</span>
          </div>
        ) : (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">APN</span>
            <span className="font-medium font-mono">{plan.apn ?? '—'}</span>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Subtotal</span>
          <span>{format(subtotal)}</span>
        </div>
        {promoApplied && (
          <div className="flex justify-between text-[13px]">
            <span className="text-muted">Discount (10%)</span>
            <span className="text-accent-green">-{format(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[13px]">
          <span className="text-muted">Tax</span>
          <span>{format(tax)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-end mb-5">
        <span className="text-[20px] font-extrabold">Total</span>
        <PriceDisplay usd={total} size="md" />
      </div>

      {/* Trust badges */}
      <div className="flex flex-col gap-2">
        {TRUST_BADGES.map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-[11px] text-muted">
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Panel wrapper ──────────────────────────────────────────────────────── */

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-[14px] p-7 relative overflow-hidden',
        className,
      )}
    >
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      {children}
    </div>
  )
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5">
      {children}
    </p>
  )
}

/* ─── Step 1 ─────────────────────────────────────────────────────────────── */

function StepDetails({
  order,
  email, setEmail,
  name, setName,
  phone, setPhone,
  promo, setPromo,
  emailError, setEmailError,
  promoApplied, setPromoApplied,
  promoMsg, setPromoMsg,
  deviceChecked, setDeviceChecked,
  onContinue,
}: {
  order: Order
  email: string; setEmail: (v: string) => void
  name: string; setName: (v: string) => void
  phone: string; setPhone: (v: string) => void
  promo: string; setPromo: (v: string) => void
  emailError: boolean; setEmailError: (v: boolean) => void
  promoApplied: boolean; setPromoApplied: (v: boolean) => void
  promoMsg: string; setPromoMsg: (v: string) => void
  deviceChecked: boolean; setDeviceChecked: (v: boolean) => void
  onContinue: () => void
}) {
  function applyPromo() {
    if (promo.trim().toUpperCase() === VALID_PROMO) {
      setPromoApplied(true)
      setPromoMsg(`✓ Code ${VALID_PROMO} applied — 10% off!`)
      toast.success('Promo applied', '10% off your order')
    } else if (promo.trim()) {
      setPromoApplied(false)
      setPromoMsg('✗ Invalid promo code')
      toast.error('Invalid promo code', 'Try TRAVEL10')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
      <Panel>
        <PanelTitle>Your Details</PanelTitle>

        {/* Email */}
        <div className="mb-[18px]">
          <label className="block text-[12px] font-semibold text-secondary mb-1.5">
            Email address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(false) }}
            onBlur={() => { if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setEmailError(true) }}
            placeholder="you@email.com"
            className={cn(
              INPUT_BASE,
              emailError && 'border-accent-pink focus:border-accent-pink',
            )}
          />
          <p className="text-[11px] text-muted mt-1">QR code will be sent to this email</p>
          {emailError && (
            <p className="text-[11px] text-accent-pink mt-1">Please enter a valid email address</p>
          )}
        </div>

        {/* Name */}
        <div className="mb-[18px]">
          <label className="block text-[12px] font-semibold text-secondary mb-1.5">
            Full name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className={INPUT_BASE}
          />
        </div>

        {/* Phone */}
        <div className="mb-[18px]">
          <label className="block text-[12px] font-semibold text-secondary mb-1.5">
            Phone number <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className={INPUT_BASE}
          />
        </div>

        {/* Device check */}
        <div className="bg-white/[0.02] border border-border rounded-[14px] p-5 mb-[18px]">
          <p className="text-[14px] font-semibold mb-1">📱 Device compatibility</p>
          <p className="text-[12px] text-muted mb-4 leading-relaxed">
            Make sure your phone supports eSIM before purchasing. Most phones from 2019+ support it.
          </p>
          <div className="flex items-end gap-3 mb-4">
            <MiniDialPhone />
            <div className="flex flex-col items-center gap-1 self-center mb-7">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted">then</span>
              <span className="text-lg text-accent-purple">→</span>
            </div>
            <MiniResultPhone />
          </div>
          <button
            onClick={() => setDeviceChecked(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border-hover bg-card text-secondary text-[12px] font-medium transition-all duration-200 hover:bg-card-hover hover:text-primary"
          >
            Check my device →
          </button>
          {deviceChecked && (
            <div className="mt-2.5 px-3.5 py-2.5 rounded-lg text-[12px] font-medium bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-accent-green">
              ✓ Your device supports eSIM. You&apos;re good to go!
            </div>
          )}
        </div>

        {/* Promo */}
        <div className="mb-[18px]">
          <label className="block text-[12px] font-semibold text-secondary mb-1.5">
            Promo code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
              placeholder="Enter code"
              className={cn(INPUT_BASE, 'flex-1')}
            />
            <button
              onClick={applyPromo}
              className="px-5 py-3.5 rounded-[14px] border border-border-hover bg-card-hover text-secondary text-[13px] font-semibold transition-all duration-200 hover:bg-white/10 hover:text-primary whitespace-nowrap"
            >
              Apply
            </button>
          </div>
          {promoMsg && (
            <p className={cn('text-[11px] mt-1.5', promoApplied ? 'text-accent-green' : 'text-accent-pink')}>
              {promoMsg}
            </p>
          )}
        </div>

        <button
          onClick={onContinue}
          className="w-full py-4 mt-2 rounded-[14px] bg-gradient-btn text-white text-[15px] font-bold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)]"
        >
          Continue to Payment →
        </button>
      </Panel>

      <OrderSummary order={order} promoApplied={promoApplied} />
    </div>
  )
}

/* ─── Step 2 ─────────────────────────────────────────────────────────────── */

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

function StepPayment({
  order,
  email,
  name,
  phone,
  promoApplied,
  onPaid,
  onBack,
}: {
  order: Order
  email: string
  name: string
  phone: string
  promoApplied: boolean
  onPaid: (orderId: string, orderNumber: string) => void
  onBack: () => void
}) {
  const { code: currencyCode, format } = useCurrency()
  const { total, discount } = computeTotals(displayPriceUsd(order.plan), promoApplied)
  const [processing, setProcessing] = useState(false)
  const [showTestPanel, setShowTestPanel] = useState(false)

  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardError, setCardError] = useState('')
  const [failed, setFailed] = useState(false)

  function fillTestCard() {
    setCardNumber(TEST_CARD_DISPLAY.number)
    setCardName(TEST_CARD_DISPLAY.name)
    setExpiry(TEST_CARD_DISPLAY.expiry)
    setCvv(TEST_CARD_DISPLAY.cvv)
    setCardError('')
    setFailed(false)
  }

  async function pay() {
    // Light shape check — the server (gateway) is authoritative on success.
    if (cardNumber.replace(/\s/g, '').length < 16 || expiry.length < 5 || cvv.length < 3 || !cardName.trim()) {
      setFailed(false)
      setCardError('Please complete all card fields.')
      return
    }
    setCardError('')
    setFailed(false)
    setProcessing(true)
    try {
      // 1. Create the order (server takes a pricing snapshot + locks fx rate).
      const created = await apiCreateOrder({
        planSlug: order.plan.slug,
        customerEmail: email,
        customerName: name || null,
        customerPhone: phone || null,
        currency: currencyCode,
        discountUsd: discount,
      })
      // 2. Authorise + capture via the active gateway in one round-trip.
      const result = await payOrder(created.id, {
        method: 'card',
        card: { number: cardNumber, name: cardName, expiry, cvv },
      })
      if (result.paymentStatus !== 'SUCCESS') {
        const msg = result.failureReason || 'Payment was declined. Check your card details and try again.'
        setFailed(true)
        setCardError(msg)
        toast.error('Payment failed', msg)
        return
      }
      toast.success('Payment successful', `${format(total)} captured`)
      onPaid(created.id, created.orderNumber)
    } catch (err) {
      const msg = (err as Error).message || 'Something went wrong. Please try again.'
      setFailed(true)
      setCardError(msg)
      toast.error('Payment failed', msg)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
      <Panel>
        {/* Header + TEST MODE badge */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">
            Payment Method
          </p>
          {TEST_MODE && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Sandbox · Test Mode
            </span>
          )}
        </div>

        {/* Single payment method — Card only */}
        <div className="flex items-center gap-3.5 px-[18px] py-[18px] border border-accent-purple bg-[rgba(147,51,234,0.08)] rounded-[14px] mb-4">
          <span className="text-2xl">💳</span>
          <div>
            <h4 className="text-[14px] font-semibold">Credit / Debit Card</h4>
            <p className="text-[11px] text-muted">Visa, Mastercard, Rupay</p>
          </div>
        </div>

        {/* Collapsible sandbox test-card panel */}
        {TEST_MODE && (
          <div className="mb-5 rounded-[14px] border border-amber-400/25 bg-amber-400/[0.04] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTestPanel((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-amber-400/[0.06]"
            >
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-200">
                🧪 Sandbox test card
              </span>
              <span className="text-[11px] font-medium text-amber-300/80">{showTestPanel ? 'Hide' : 'Show'}</span>
            </button>
            {showTestPanel && (
              <div className="px-4 pb-4 pt-1 border-t border-amber-400/15" style={{ animation: 'fadeIn 0.2s ease' }}>
                <p className="text-[11px] text-muted my-3">Use these exact details — any change is declined.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {[
                    ['Card number', TEST_CARD_DISPLAY.number],
                    ['Name', TEST_CARD_DISPLAY.name],
                    ['Expiry', TEST_CARD_DISPLAY.expiry],
                    ['CVV', TEST_CARD_DISPLAY.cvv],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
                      <span className="text-[12px] font-mono font-semibold text-secondary">{value}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={fillTestCard}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-200 text-[12px] font-semibold transition-colors hover:bg-amber-400/15"
                >
                  Use test card →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Card form */}
        <div className="flex flex-col gap-3.5 mb-5" style={{ animation: 'fadeIn 0.25s ease' }}>
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Card number</label>
            <input
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => { setCardNumber(formatCardNumber(e.target.value)); setFailed(false) }}
              placeholder="1234 4321 1234 4321"
              className={cn(INPUT_BASE, 'font-mono tracking-wider', failed && 'border-accent-pink focus:border-accent-pink')}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Name on card</label>
            <input
              value={cardName}
              onChange={(e) => { setCardName(e.target.value); setFailed(false) }}
              placeholder="SIMZZY"
              className={cn(INPUT_BASE, failed && 'border-accent-pink focus:border-accent-pink')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-secondary mb-1.5">Expiry</label>
              <input
                inputMode="numeric"
                value={expiry}
                onChange={(e) => { setExpiry(formatExpiry(e.target.value)); setFailed(false) }}
                placeholder="MM/YY"
                className={cn(INPUT_BASE, 'font-mono', failed && 'border-accent-pink focus:border-accent-pink')}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-secondary mb-1.5">CVV</label>
              <input
                inputMode="numeric"
                value={cvv}
                onChange={(e) => { setCvv(e.target.value.replace(/\D/g, '').slice(0, 4)); setFailed(false) }}
                placeholder="123"
                className={cn(INPUT_BASE, 'font-mono', failed && 'border-accent-pink focus:border-accent-pink')}
              />
            </div>
          </div>
        </div>

        {/* Error / failed state */}
        {cardError && (
          <div className="mb-4 px-4 py-3 rounded-[14px] border border-accent-pink/40 bg-[rgba(255,45,120,0.08)] flex items-start gap-2.5" style={{ animation: 'fadeIn 0.2s ease' }}>
            <span className="text-accent-pink text-[15px] leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-[13px] font-semibold text-accent-pink">{failed ? 'Payment failed' : 'Check your details'}</p>
              <p className="text-[12px] text-secondary mt-0.5">{cardError}</p>
            </div>
          </div>
        )}

        <button
          onClick={pay}
          disabled={processing}
          className="w-full py-4 mt-2 rounded-[14px] bg-gradient-btn text-white text-[15px] font-bold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)] disabled:opacity-60 disabled:hover:translate-y-0 inline-flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Processing payment…
            </>
          ) : failed ? (
            <>Retry — Pay {format(total)} →</>
          ) : (
            <>Pay {format(total)} →</>
          )}
        </button>
        <button
          onClick={onBack}
          disabled={processing}
          className="w-full py-3.5 mt-2 rounded-[14px] border border-border-hover bg-card text-secondary text-[13px] font-semibold transition-all duration-200 hover:bg-card-hover hover:text-primary disabled:opacity-50"
        >
          ← Back to details
        </button>

        <div className="mt-4 text-center p-5 border border-border rounded-[14px] bg-[rgba(34,197,94,0.04)]">
          <div className="text-[28px] mb-2">{TEST_MODE ? '🧪' : '🛡️'}</div>
          <h4 className="text-[14px] font-semibold text-accent-green mb-1">
            {TEST_MODE ? 'Sandbox payment' : 'Secure payment'}
          </h4>
          <p className="text-[11px] text-muted leading-relaxed">
            {TEST_MODE
              ? 'No real card is charged. This is a test gateway for end-to-end order testing.'
              : 'Your payment info is encrypted and processed securely. We never store your card details.'}
          </p>
        </div>
      </Panel>

      <OrderSummary order={order} promoApplied={promoApplied} email={email} showEmail />
    </div>
  )
}

/* ─── Step 3 ─────────────────────────────────────────────────────────────── */

function StepConfirmation({
  order,
  email,
  promoApplied,
}: {
  order: Order
  email: string
  promoApplied: boolean
}) {
  const { format } = useCurrency()
  const { plan } = order
  const displayEmail = email || 'you@email.com'
  const { total } = computeTotals(displayPriceUsd(plan), promoApplied)

  const orderRows = [
    { label: 'Order ID', value: order.orderNumber },
    { label: 'Plan', value: `${plan.name} / ${plan.days}d` },
    { label: 'Network', value: plan.network ?? '—' },
    { label: 'APN', value: plan.apn ?? '—' },
    { label: 'Amount paid', value: format(total), green: true },
    { label: 'Status', value: '✓ Active', green: true },
  ]

  const installSteps = [
    {
      num: '1',
      title: 'Open Settings',
      desc: 'Go to Settings → Cellular → Add eSIM (iPhone) or Settings → Connections → SIM Manager (Android)',
    },
    {
      num: '2',
      title: 'Scan QR Code',
      desc: 'Select "Scan QR Code" and point your camera at the code above. Or open the email on another device.',
    },
    {
      num: '3',
      title: 'Activate at destination',
      desc: 'Turn on the eSIM when you arrive. Your data plan starts when you connect to a local network.',
    },
  ]

  return (
    <div className="text-center max-w-[600px] mx-auto">
      {/* Check icon + confetti */}
      <div className="relative inline-block mb-6">
        <span
          className="absolute text-[16px]"
          style={{ top: -10, left: 20, animation: 'confetti1 1s ease 0.3s both' }}
        >
          🎉
        </span>
        <span
          className="absolute text-[16px]"
          style={{ top: -5, right: 30, animation: 'confetti2 1.1s ease 0.4s both' }}
        >
          ✨
        </span>
        <span
          className="absolute text-[16px]"
          style={{ top: 0, left: '50%', animation: 'confetti3 0.9s ease 0.5s both' }}
        >
          🎊
        </span>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-[36px]"
          style={{
            background: 'rgba(34,197,94,0.12)',
            border: '2px solid rgba(34,197,94,0.3)',
            animation: 'checkPop 0.5s ease 0.2s both',
          }}
        >
          ✓
        </div>
      </div>

      <h2 className="text-[30px] font-extrabold tracking-[-0.5px] mb-2">Payment Successful!</h2>
      <p className="text-[14px] text-secondary mb-8">
        Your eSIM is ready. QR code sent to{' '}
        <strong className="text-primary">{displayEmail}</strong>
      </p>

      {/* QR section */}
      <div
        className="bg-card border border-border rounded-[14px] p-7 mb-6"
        style={{ animation: 'scaleIn 0.4s ease 0.3s both', opacity: 0 }}
      >
        <div className="w-[180px] h-[180px] rounded-xl bg-white flex items-center justify-center mx-auto mb-4 overflow-hidden">
          <QRCodeSVG />
        </div>
        <p className="text-[13px] text-secondary mb-1">Scan this QR code to install your eSIM</p>
        <p className="text-[14px] font-semibold text-accent-green">Also sent to {displayEmail}</p>
      </div>

      {/* Order details */}
      <div
        className="bg-card border border-border rounded-[14px] p-6 mb-6 text-left"
        style={{ animation: 'fadeUp 0.4s ease 0.5s both', opacity: 0 }}
      >
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-3.5">
          Order Details
        </p>
        {orderRows.map(({ label, value, green }) => (
          <div
            key={label}
            className="flex justify-between text-[13px] py-2.5 border-b border-border last:border-none"
          >
            <span className="text-muted">{label}</span>
            <span className={cn('font-semibold', green && 'text-accent-green')}>{value}</span>
          </div>
        ))}
      </div>

      {/* Install guide */}
      <div
        className="bg-card border border-border rounded-[14px] p-6 mb-6 text-left"
        style={{ animation: 'fadeUp 0.4s ease 0.6s both', opacity: 0 }}
      >
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-3.5">
          How to install
        </p>
        {installSteps.map(({ num, title, desc }) => (
          <div
            key={num}
            className="flex gap-3.5 py-3.5 border-b border-border last:border-none"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold text-accent-pink font-mono flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(255,45,120,0.15), rgba(147,51,234,0.15))',
              }}
            >
              {num}
            </div>
            <div>
              <h4 className="text-[14px] font-semibold mb-0.5">{title}</h4>
              <p className="text-[12px] text-muted leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div
        className="flex gap-3 sm:flex-row flex-col"
        style={{ animation: 'fadeUp 0.4s ease 0.7s both', opacity: 0 }}
      >
        <Link
          href={order.orderId ? `/dashboard/orders/${order.orderId}` : '/dashboard'}
          className="flex-1 py-4 rounded-[14px] bg-gradient-btn text-white text-[15px] font-bold text-center transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)] flex items-center justify-center"
        >
          View Order
        </Link>
        <Link
          href="/browse"
          className="flex-1 py-4 rounded-[14px] border border-border-hover bg-card text-secondary text-[13px] font-semibold text-center transition-all duration-200 hover:bg-card-hover hover:text-primary flex items-center justify-center"
        >
          Browse more plans
        </Link>
      </div>
    </div>
  )
}

/* ─── Checkout (inner — uses search params) ──────────────────────────────── */

function CheckoutInner() {
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan')

  const [plan, setPlan] = useState<PlanDetailDto | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [planError, setPlanError] = useState<string | null>(null)

  // Fetch the requested plan, or fall back to the top-popular plan if none
  // was specified (e.g. user landed on /checkout directly).
  useEffect(() => {
    const ctrl = new AbortController()
    setPlanLoading(true)
    setPlanError(null)

    const promise: Promise<PlanDetailDto | null> = planSlug
      ? fetchPlanBySlug(planSlug, ctrl.signal)
      : fetchPlans({ sort: 'popular', perPage: 1 }, ctrl.signal).then((r) =>
          r.items[0] ? fetchPlanBySlug(r.items[0].slug, ctrl.signal) : null,
        )

    promise
      .then((p) => setPlan(p))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === 'AbortError') return
        setPlanError((e as Error).message ?? 'Failed to load plan')
      })
      .finally(() => setPlanLoading(false))

    return () => ctrl.abort()
  }, [planSlug])

  // Server-side order id + number — populated when payment succeeds.
  // Until then we show a "preview" number so the order summary stays meaningful
  // before the user clicks Pay.
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `SIM-${today}-${Math.floor(1000 + Math.random() * 9000)}`
  })

  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [promo, setPromo] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoMsg, setPromoMsg] = useState('')
  const [deviceChecked, setDeviceChecked] = useState(false)

  // Payment success → confirmation.
  function handlePaid(realId: string, realNumber: string) {
    setOrderId(realId)
    setOrderNumber(realNumber)
    goToStep(3)
  }

  function goToStep(next: Step) {
    if (next === 2 && step === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError(true)
        toast.error('Email required', 'Enter a valid email to continue')
        return
      }
      setEmailError(false)
    }
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Loading / error / not-found gate — the rest of the page assumes `plan` is set.
  if (planLoading || planError || !plan) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        {planError ? (
          <div className="text-center">
            <p className="text-accent-pink text-[14px] mb-4">{planError}</p>
            <Link
              href="/browse"
              className="inline-block px-5 py-2.5 rounded-lg border border-border bg-card text-secondary text-[13px] hover:text-primary"
            >
              Back to browse
            </Link>
          </div>
        ) : !planLoading && !plan ? (
          <div className="text-center">
            <p className="text-secondary text-[14px] mb-4">Plan not found.</p>
            <Link
              href="/browse"
              className="inline-block px-5 py-2.5 rounded-lg border border-border bg-card text-secondary text-[13px] hover:text-primary"
            >
              Back to browse
            </Link>
          </div>
        ) : (
          <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        )}
      </div>
    )
  }

  const order: Order = { plan, orderId, orderNumber }

  return (
    <>
      {/* Hero header */}
      <section
        className="relative py-20 overflow-hidden text-center"
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
        <div className="relative z-10 px-6">
          <h1
            className="animate delay-1 text-[36px] md:text-[42px] font-extrabold tracking-[-1.5px] mb-2"
            style={{
              background: 'linear-gradient(180deg, #fff 0%, #c8b0e8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Secure Checkout
          </h1>
          <p className="animate delay-2 text-[15px] text-secondary">
            Complete your purchase and get connected instantly
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[1100px] mx-auto px-6 pb-20">
        {/* Progress bar */}
        <div className="animate delay-3 pt-10 pb-10">
          <ProgressBar step={step} />
        </div>

        {/* Step views */}
        {step === 1 && (
          <div className="animate">
            <StepDetails
              order={order}
              email={email} setEmail={setEmail}
              name={name} setName={setName}
              phone={phone} setPhone={setPhone}
              promo={promo} setPromo={setPromo}
              emailError={emailError} setEmailError={setEmailError}
              promoApplied={promoApplied} setPromoApplied={setPromoApplied}
              promoMsg={promoMsg} setPromoMsg={setPromoMsg}
              deviceChecked={deviceChecked} setDeviceChecked={setDeviceChecked}
              onContinue={() => goToStep(2)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="animate">
            <StepPayment
              order={order}
              email={email}
              name={name}
              phone={phone}
              promoApplied={promoApplied}
              onPaid={handlePaid}
              onBack={() => goToStep(1)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="animate">
            <StepConfirmation order={order} email={email} promoApplied={promoApplied} />
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  )
}
