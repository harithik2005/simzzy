'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

/* ─── Data ─────────────────────────────────────────────────────────────── */

const devices = [
  { icon: '📱', label: 'iPhone XS+' },
  { icon: '📱', label: 'Samsung S20+' },
  { icon: '📱', label: 'Google Pixel' },
  { icon: '📱', label: 'OnePlus' },
  { icon: '📱', label: 'Xiaomi' },
  { icon: '📱', label: 'iPad Pro' },
]

const DIAL_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]

/* ─── Shared phone shell ────────────────────────────────────────────────── */

const PHONE_BODY: React.CSSProperties = {
  width: 150,
  height: 288,
  borderRadius: 30,
  background: 'linear-gradient(175deg, #120025 0%, #070012 100%)',
  border: '2px solid rgba(255,255,255,0.14)',
  padding: 8,
  position: 'relative',
  boxShadow:
    '0 28px 56px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)',
  flexShrink: 0,
}

const SCREEN: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: 23,
  background: '#0c0024',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const NOTCH: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 62,
  height: 15,
  borderRadius: '0 0 9px 9px',
  background: '#070012',
  border: '2px solid rgba(255,255,255,0.1)',
  borderTop: 'none',
  zIndex: 10,
}

const STATUS_BAR: React.CSSProperties = {
  paddingTop: 20,
  paddingBottom: 4,
  paddingLeft: 12,
  paddingRight: 12,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const STATUS_TEXT: React.CSSProperties = {
  fontSize: 7,
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'monospace',
}

/* ─── Left phone: dialler ───────────────────────────────────────────────── */

function DialPhone() {
  return (
    <div>
      <div style={PHONE_BODY}>
        <div style={NOTCH} />
        <div style={SCREEN}>
          {/* Status bar */}
          <div style={STATUS_BAR}>
            <span style={STATUS_TEXT}>9:41</span>
            <span style={STATUS_TEXT}>●●●</span>
          </div>

          {/* Number display */}
          <div
            style={{
              margin: '4px 10px 6px',
              padding: '7px 10px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              fontFamily: 'monospace',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              letterSpacing: 3,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            *#06#
          </div>

          {/* Dial pad */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 5,
              padding: '0 10px',
              flex: 1,
              alignContent: 'start',
            }}
          >
            {DIAL_ROWS.map((row) =>
              row.map((key) => (
                <div
                  key={key}
                  style={{
                    height: 31,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    background:
                      key === '*' || key === '#'
                        ? 'rgba(147,51,234,0.14)'
                        : 'rgba(255,255,255,0.05)',
                    border:
                      key === '*' || key === '#'
                        ? '1px solid rgba(147,51,234,0.25)'
                        : '1px solid rgba(255,255,255,0.06)',
                    fontSize: 13,
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

          {/* Call button */}
          <div style={{ padding: '6px 10px 10px' }}>
            <div
              style={{
                height: 28,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #22c55e, #15803d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
              }}
            >
              📞
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p
        style={{
          marginTop: 10,
          textAlign: 'center',
          fontSize: 9,
          fontFamily: 'monospace',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#7a5ea0',
          fontWeight: 700,
        }}
      >
        Dial&nbsp;&nbsp;*#06#
      </p>
    </div>
  )
}

/* ─── Right phone: EID result ───────────────────────────────────────────── */

function ResultPhone() {
  return (
    <div>
      <div style={PHONE_BODY}>
        <div style={NOTCH} />
        <div style={SCREEN}>
          {/* Status bar */}
          <div style={STATUS_BAR}>
            <span style={STATUS_TEXT}>9:41</span>
            <span style={STATUS_TEXT}>●●●</span>
          </div>

          {/* Screen title */}
          <div style={{ padding: '2px 10px 6px' }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.75)',
                marginBottom: 5,
              }}
            >
              Device Info
            </p>
            <div
              style={{ height: 1, background: 'rgba(255,255,255,0.07)' }}
            />
          </div>

          {/* EID row — highlighted green ✓ */}
          <div
            style={{
              margin: '0 8px 6px',
              padding: '8px 10px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.32)',
              borderRadius: 9,
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#22c55e',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>✓</span> EID
            </div>
            <p
              style={{
                fontSize: 9,
                color: '#b8a0d8',
                fontFamily: 'monospace',
                letterSpacing: 2,
              }}
            >
              ••••••••••••••••
            </p>
          </div>

          {/* Crossed-out rows ✗ */}
          {(['IMEI', 'IMEI2', 'MEID'] as const).map((label) => (
            <div
              key={label}
              style={{
                margin: '0 8px 4px',
                padding: '6px 10px',
                background: 'rgba(255,45,120,0.05)',
                border: '1px solid rgba(255,45,120,0.12)',
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{ fontSize: 9, color: '#ff2d78', fontWeight: 700 }}
              >
                ✗
              </span>
              <span
                style={{
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.28)',
                  textDecoration: 'line-through',
                  textDecorationColor: '#ff2d78',
                }}
              >
                Not {label}
              </span>
            </div>
          ))}

          {/* Home indicator */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 3,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.18)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Caption */}
      <p
        style={{
          marginTop: 10,
          textAlign: 'center',
          fontSize: 9,
          fontFamily: 'monospace',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#22c55e',
          fontWeight: 700,
        }}
      >
        EID = eSIM Ready ✓
      </p>
    </div>
  )
}

/* ─── Section ───────────────────────────────────────────────────────────── */

export default function DeviceCheck() {
  const { ref, inView } = useInView()

  return (
    <section ref={ref} id="devices" className="py-20">
      <div className="max-w-[1100px] mx-auto px-6">
        <div
          className={cn(
            'bg-card border border-border rounded-[20px] overflow-hidden',
            inView ? 'animate' : 'opacity-0',
          )}
        >
          {/* Top gradient accent stripe */}
          <div className="h-[2px] bg-gradient-btn" />

          <div className="p-8 md:p-12">
            {/* ── Header ── */}
            <div className="mb-8">
              <p className="font-mono text-[11px] font-bold tracking-[3px] uppercase text-accent-pink mb-3">
                Compatibility
              </p>
              <h2 className="text-[28px] md:text-[34px] font-bold tracking-tight">
                Does Your Phone Support eSIM?
              </h2>
            </div>

            {/* ── Main content: text left, phones right ── */}
            <div className="flex flex-col lg:flex-row items-start gap-10 mb-10">
              {/* Instructions */}
              <div className="flex-1 space-y-5">
                {/* Step instruction */}
                <div className="flex gap-4 items-start">
                  <span
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,45,120,0.2), rgba(147,51,234,0.2))',
                      border: '1px solid rgba(147,51,234,0.3)',
                      color: '#9333ea',
                    }}
                  >
                    1
                  </span>
                  <p className="text-[15px] text-primary leading-relaxed pt-0.5">
                    Dial{' '}
                    <span
                      className="font-mono font-bold px-2 py-0.5 rounded-md text-accent-purple"
                      style={{
                        background: 'rgba(147,51,234,0.12)',
                        border: '1px solid rgba(147,51,234,0.25)',
                      }}
                    >
                      *#06#
                    </span>{' '}
                    on your phone. If the{' '}
                    <span className="text-accent-green font-semibold">
                      EID serial number
                    </span>{' '}
                    is displayed, your phone supports eSIM.
                  </p>
                </div>

                {/* Note */}
                <div
                  className="flex gap-3 items-start rounded-xl p-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-base shrink-0 mt-0.5">💡</span>
                  <p className="text-[13px] text-secondary leading-relaxed">
                    You can contact customer service before placing an order to
                    confirm device compatibility.
                  </p>
                </div>
              </div>

              {/* Phone mockups */}
              <div className="flex items-end gap-4 shrink-0 self-center lg:self-start">
                <DialPhone />

                {/* Arrow connector */}
                <div className="flex flex-col items-center gap-1 self-center mb-10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                    then
                  </span>
                  <span className="text-xl text-accent-purple">→</span>
                </div>

                <ResultPhone />
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-border mb-8" />

            {/* ── Device chips ── */}
            <p className="text-xs font-mono uppercase tracking-[2px] text-muted mb-4">
              Works on
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
              {devices.map((d) => (
                <div
                  key={d.label}
                  className="bg-white/[0.04] border border-border rounded-[10px] px-3 py-3 text-center text-[11px] font-medium text-secondary transition-all duration-200 hover:bg-card-hover hover:border-border-hover cursor-default"
                >
                  <span className="text-[20px] block mb-1.5">{d.icon}</span>
                  {d.label}
                </div>
              ))}
            </div>

            {/* ── CTAs ── */}
            <div className="flex flex-col items-center gap-4">
              <Link
                href="/device-check"
                className="inline-flex items-center gap-1.5 px-7 py-3.5 rounded-xl bg-gradient-btn text-white text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,45,120,0.3)]"
              >
                Open device checker →
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors duration-200"
              >
                <MessageCircle className="w-4 h-4 text-accent-pink" />
                <span>
                  Need help?{' '}
                  <span className="text-accent-pink font-semibold hover:underline">
                    Chat with our support →
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
