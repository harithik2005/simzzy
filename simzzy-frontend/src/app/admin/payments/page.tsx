'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Search, RefreshCw } from 'lucide-react'
import {
  fetchAdminPayments,
  fetchAdminPayment,
  type AdminPaymentDto,
  type AdminPaymentDetailDto,
  type PaymentStatsDto,
} from '@/lib/admin-client'
import Modal from '@/components/admin/Modal'
import StatusPill from '@/components/admin/StatusPill'
import { toast } from '@/store/toast'

const STATUS_COLOR: Record<string, 'green' | 'yellow' | 'purple' | 'red'> = {
  SUCCESS: 'green',
  PENDING: 'yellow',
  PROCESSING: 'yellow',
  REFUNDED: 'purple',
  FAILED: 'red',
}

const STATUSES = ['all', 'SUCCESS', 'PENDING', 'PROCESSING', 'REFUNDED', 'FAILED'] as const
type StatusFilter = (typeof STATUSES)[number]

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentDto[]>([])
  const [stats, setStats] = useState<PaymentStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<AdminPaymentDetailDto | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (s: StatusFilter, q: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminPayments({ status: s, q: q || undefined })
      setPayments(data.payments)
      setStats(data.stats)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(status, search), 250)
    return () => clearTimeout(t)
  }, [status, search, load])

  async function openDetail(id: string) {
    setDetailLoading(true)
    try {
      setDetail(await fetchAdminPayment(id))
    } catch (e) {
      toast.error('Failed to load payment', (e as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  const statTiles = stats
    ? [
        { label: 'Captured (USD)', value: `$${stats.capturedUsd.toFixed(2)}`, accent: 'text-accent-green' },
        { label: 'Refunded (USD)', value: `$${stats.refundedUsd.toFixed(2)}`, accent: 'text-accent-purple' },
        { label: 'Total payments', value: stats.total.toLocaleString(), accent: 'text-primary' },
        { label: 'Success rate', value: `${stats.successRate}%`, accent: 'text-primary' },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
            Finance
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Payments</h1>
          <p className="text-[13px] text-muted mt-1">{payments.length} transactions</p>
        </div>
        <button
          onClick={() => load(status, search)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error} — <button onClick={() => load(status, search)} className="underline">retry</button>
        </div>
      )}

      {/* Stat tiles */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statTiles.map((t) => (
            <div key={t.label} className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">{t.label}</p>
              <p className={`text-[20px] font-extrabold ${t.accent}`}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All status' : s.toLowerCase()}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gateway ID, order number or email"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Provider</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors">
                  <td className="px-5 py-3 font-mono text-muted text-[11px]">{p.orderNumber}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-primary">{p.customerName ?? '—'}</p>
                    <p className="text-muted text-[11px]">{p.customerEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-secondary">{p.provider}</td>
                  <td className="px-5 py-3 text-secondary">{p.method ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-bold text-primary font-mono">
                    ${p.usdAmount.toFixed(2)}
                    {p.currency !== 'USD' && <span className="block text-[10px] text-muted font-normal">{p.amount.toFixed(2)} {p.currency}</span>}
                  </td>
                  <td className="px-5 py-3"><StatusPill color={STATUS_COLOR[p.status] ?? 'gray'}>{p.status.toLowerCase()}</StatusPill></td>
                  <td className="px-5 py-3 text-muted font-mono text-[11px]">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => openDetail(p.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-purple transition-all"
                        title="View"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted text-[13px]">
                    {loading ? 'Loading…' : 'No payments match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border">
          {payments.map((p) => (
            <button key={p.id} onClick={() => openDetail(p.id)} className="w-full text-left p-4 hover:bg-card-hover transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate">{p.customerName ?? p.customerEmail}</p>
                  <p className="text-muted text-[11px] font-mono truncate">{p.orderNumber}</p>
                </div>
                <p className="font-bold text-[14px] text-gradient flex-shrink-0">${p.usdAmount.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span className="font-mono">{p.provider} · {new Date(p.createdAt).toLocaleDateString()}</span>
                <StatusPill color={STATUS_COLOR[p.status] ?? 'gray'}>{p.status.toLowerCase()}</StatusPill>
              </div>
            </button>
          ))}
          {payments.length === 0 && (
            <p className="px-5 py-12 text-center text-muted text-[13px]">{loading ? 'Loading…' : 'No payments match the current filters.'}</p>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Modal open={!!detail || detailLoading} onClose={() => setDetail(null)} title="Payment detail" width="560px">
        {detailLoading || !detail ? (
          <div className="py-10 flex items-center justify-center">
            <span className="w-7 h-7 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3">
              <DetailRow label="Order" value={detail.orderNumber} mono />
              <DetailRow label="Status" value={detail.status} />
              <DetailRow label="Customer" value={detail.customerName ?? detail.customerEmail} />
              <DetailRow label="Email" value={detail.customerEmail} />
              <DetailRow label="Provider" value={detail.provider} />
              <DetailRow label="Method" value={detail.method ?? '—'} />
              <DetailRow label="Amount (USD)" value={`$${detail.usdAmount.toFixed(2)}`} mono />
              <DetailRow label="Charged" value={`${detail.amount.toFixed(2)} ${detail.currency}`} mono />
              <DetailRow label="Gateway ID" value={detail.gatewayPaymentId ?? '—'} mono />
              <DetailRow label="Paid at" value={detail.paidAt ? new Date(detail.paidAt).toLocaleString() : '—'} mono />
            </div>
            {detail.failureReason && (
              <p className="text-[12px] text-accent-pink border border-accent-pink/30 bg-accent-pink/[0.06] rounded-lg p-2.5">
                {detail.failureReason}
              </p>
            )}

            <div>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Payment history</p>
              {detail.events.length === 0 ? (
                <p className="text-[12px] text-muted">No gateway events recorded.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {detail.events.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg">
                      <span className="font-mono text-[12px] text-secondary">{e.eventType}</span>
                      <span className="text-[11px] text-muted font-mono">{new Date(e.receivedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detail.refunds.length > 0 && (
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Refunds</p>
                <div className="flex flex-col gap-1.5">
                  {detail.refunds.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 bg-card border border-border rounded-lg">
                      <span className="font-mono text-[12px] text-secondary">{r.amount.toFixed(2)} {r.currency} · {r.status}</span>
                      <span className="text-[11px] text-muted font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted">
              Refund &amp; capture actions land with the EximPe gateway integration in a later phase.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">{label}</p>
      <p className={`font-semibold text-primary break-words ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</p>
    </div>
  )
}
