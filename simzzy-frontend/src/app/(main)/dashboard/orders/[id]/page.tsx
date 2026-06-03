'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { fetchMyOrderDetail, cancelOrder, type OrderDetailDto } from '@/lib/order-client'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PAYMENT_PROCESSING: 'Payment processing',
  PAYMENT_SUCCESS: 'Payment received',
  ORDER_SUBMITTED: 'Submitted to provider',
  QR_PENDING: 'Awaiting QR code',
  QR_RECEIVED: 'QR ready',
  DELIVERED: 'Delivered',
  ACTIVATED: 'Activated',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  COMPLETED:       { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  text: '#22c55e' },
  PAYMENT_SUCCESS: { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  text: '#22c55e' },
  PROCESSING:      { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)',  text: '#eab308' },
  PAYMENT_PENDING: { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)',  text: '#eab308' },
  PENDING:         { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)',  text: '#eab308' },
  FAILED:          { bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.25)', text: '#ff2d78' },
  CANCELLED:       { bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.25)', text: '#ff2d78' },
  REFUNDED:        { bg: 'rgba(147,51,234,0.1)',  border: 'rgba(147,51,234,0.3)',  text: '#9333ea' },
}

function PublicStatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#c8b0e8' }
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.5px]"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {status.replace('_', ' ').toLowerCase()}
    </span>
  )
}

const CANCELLABLE = new Set(['PENDING', 'PAYMENT_PROCESSING'])

function PageBody() {
  const params = useParams<{ id: string }>()
  const orderId = params.id

  const [order, setOrder] = useState<OrderDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrder(await fetchMyOrderDetail(orderId))
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { load() }, [load])

  async function handleCancel() {
    if (!order) return
    if (!confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      const updated = await cancelOrder(order.id)
      setOrder(updated)
      toast.success('Order cancelled')
    } catch (e) {
      toast.error('Cancel failed', (e as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
      </div>
    )
  }
  if (error || !order) {
    return (
      <div className="max-w-[800px] mx-auto px-6 pt-32 pb-20 text-center">
        <p className="text-accent-pink text-[14px] mb-4">{error ?? 'Order not found'}</p>
        <Link href="/dashboard" className="text-secondary text-[13px] hover:text-primary">← Back to dashboard</Link>
      </div>
    )
  }

  return (
    <>
      {/* Hero */}
      <section className="relative pt-28 pb-10 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)', animation: 'pulse 6s ease-in-out infinite' }} />
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }} />
        <div className="relative z-10 max-w-[1000px] mx-auto px-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-secondary hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
                Order
              </p>
              <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight">{order.orderNumber}</h1>
              <p className="text-[13px] text-muted mt-1">Placed {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <PublicStatusBadge status={order.publicStatus} />
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-[1000px] mx-auto px-6 pb-20 pt-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          {/* Items */}
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Items</p>
            <div className="flex flex-col gap-3">
              {order.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-border">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate">{i.planName}</p>
                    <p className="text-[11px] text-muted">{i.data} · {i.days} days · {i.country ?? i.region ?? '—'}</p>
                    <p className="text-[10px] text-muted font-mono mt-0.5">{i.appliedRuleLabel ?? i.appliedRuleType}</p>
                  </div>
                  <PriceDisplay usd={i.sellingPriceUsd * i.quantity} size="sm" className="items-end" />
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Timeline</p>
            <ol className="flex flex-col gap-3">
              {order.timeline.map((ev) => {
                const isFail = ev.toStatus === 'FAILED' || ev.toStatus === 'CANCELLED'
                const isSuccess = ['DELIVERED', 'ACTIVATED', 'PAYMENT_SUCCESS', 'QR_RECEIVED', 'ORDER_SUBMITTED'].includes(ev.toStatus)
                return (
                  <li key={ev.id} className="flex items-start gap-3">
                    <span className="mt-1">
                      {isFail ? <XCircle className="w-4 h-4 text-accent-pink" /> :
                        isSuccess ? <CheckCircle2 className="w-4 h-4 text-accent-green" /> :
                          <Circle className="w-4 h-4 text-muted" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-primary">{STATUS_LABEL[ev.toStatus] ?? ev.toStatus}</p>
                      {ev.reason && <p className="text-[11px] text-muted">{ev.reason}</p>}
                      <p className="text-[10px] text-muted font-mono mt-0.5">{new Date(ev.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Payments */}
          {order.payments.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Payments</p>
              <div className="flex flex-col gap-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[13px] py-2 border-b border-border last:border-none">
                    <div>
                      <p className="font-semibold">{p.providerSlug} · {p.method ?? '—'}</p>
                      <p className="text-[11px] text-muted">{p.paidAt ? `Paid ${new Date(p.paidAt).toLocaleString()}` : `Created ${new Date(p.createdAt).toLocaleString()}`}</p>
                    </div>
                    <span className={cn('font-mono text-[12px] font-bold', p.status === 'SUCCESS' ? 'text-accent-green' : p.status === 'FAILED' ? 'text-accent-pink' : 'text-muted')}>
                      {p.status} · {p.currency} {p.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="lg:sticky lg:top-20 self-start">
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
            <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Summary</p>
            <Row label="Subtotal" value={`$${order.usdSubtotal.toFixed(2)}`} />
            {order.usdDiscount > 0 && <Row label="Discount" value={`-$${order.usdDiscount.toFixed(2)}`} />}
            <Row label="Total (USD)" value={`$${order.usdTotal.toFixed(2)}`} />
            <Row label="Total" value={`${order.currency} ${order.localTotal.toFixed(2)}`} bold />
            <div className="border-t border-border my-4" />
            <Row label="Email" value={order.customerEmail} small />
            {order.customerName && <Row label="Name" value={order.customerName} small />}
            {order.customerPhone && <Row label="Phone" value={order.customerPhone} small />}

            {CANCELLABLE.has(order.publicStatus) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full mt-5 py-3 rounded-lg border border-border text-secondary text-[13px] font-bold hover:bg-card-hover hover:text-accent-pink hover:border-accent-pink transition-all disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between text-[13px] py-1.5">
      <span className="text-muted">{label}</span>
      <span className={cn(bold && 'font-bold text-primary text-[15px]', small && 'text-[12px] truncate max-w-[60%] text-right')}>{value}</span>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <AuthGuard>
      <PageBody />
    </AuthGuard>
  )
}
