'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, RotateCcw, Search, RefreshCw, XCircle, StickyNote, Send } from 'lucide-react'
import StatusPill from '@/components/admin/StatusPill'
import Drawer from '@/components/admin/Drawer'
import { toast } from '@/store/toast'
import type { OrderDetailDto, OrderSummaryDto } from 'simzzy-backend'
import { addOrderInternalNote, retryAdminOrder } from '@/lib/admin-client'

/**
 * Admin Orders page. Fetches from /api/admin/orders and exposes the same
 * filter chrome the mock version had (status + date range + search). Selecting
 * a row opens a drawer with the full detail (items + timeline + payments) and
 * an admin-only status transition control.
 */

const FILTER_STATUSES = [
  'all',
  'PENDING', 'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS',
  'ORDER_SUBMITTED', 'QR_PENDING', 'QR_RECEIVED',
  'DELIVERED', 'ACTIVATED',
  'FAILED', 'CANCELLED', 'REFUNDED',
] as const

type FilterStatus = (typeof FILTER_STATUSES)[number]

const PILL_COLOR: Record<string, 'green' | 'yellow' | 'gray' | 'red' | 'purple'> = {
  PENDING: 'yellow',
  PAYMENT_PROCESSING: 'yellow',
  PAYMENT_SUCCESS: 'green',
  ORDER_SUBMITTED: 'purple',
  QR_PENDING: 'purple',
  QR_RECEIVED: 'purple',
  DELIVERED: 'green',
  ACTIVATED: 'green',
  FAILED: 'red',
  CANCELLED: 'red',
  REFUNDED: 'red',
}

const ALL_NEXT_STATUSES = [
  'PAYMENT_PROCESSING', 'PAYMENT_SUCCESS', 'ORDER_SUBMITTED',
  'QR_PENDING', 'QR_RECEIVED', 'DELIVERED', 'ACTIVATED',
  'FAILED', 'CANCELLED', 'REFUNDED',
]

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!res.ok) {
    let err: string | undefined
    try { err = (await res.json())?.error } catch {}
    throw new Error(err ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [orders, setOrders] = useState<OrderSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<OrderDetailDto | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [note, setNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (status !== 'all') sp.set('status', status)
      if (from) sp.set('dateFrom', from)
      if (to) sp.set('dateTo', to)
      if (search.trim()) sp.set('q', search.trim())
      const data = await jsonFetch<{ orders: OrderSummaryDto[] }>(`/api/admin/orders?${sp.toString()}`)
      setOrders(data.orders)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [status, from, to, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedId) { setSelectedDetail(null); return }
    let active = true
    setDetailLoading(true)
    jsonFetch<{ order: OrderDetailDto }>(`/api/admin/orders/${selectedId}`)
      .then((r) => { if (active) setSelectedDetail(r.order) })
      .catch((e) => { if (active) toast.error('Failed to load order', (e as Error).message) })
      .finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [selectedId])

  async function transitionTo(toStatus: string, reason?: string) {
    if (!selectedDetail) return
    try {
      const r = await jsonFetch<{ order: OrderDetailDto }>(`/api/admin/orders/${selectedDetail.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, reason }),
      })
      setSelectedDetail(r.order)
      toast.success('Status updated', `${selectedDetail.status} → ${toStatus}`)
      load()
    } catch (e) {
      toast.error('Transition rejected', (e as Error).message)
    }
  }

  async function submitNote() {
    if (!selectedDetail || !note.trim()) return
    setNoteSaving(true)
    try {
      await addOrderInternalNote(selectedDetail.id, note)
      const refreshed = await jsonFetch<{ order: OrderDetailDto }>(`/api/admin/orders/${selectedDetail.id}`)
      setSelectedDetail(refreshed.order)
      setNote('')
      toast.success('Internal note added')
    } catch (e) {
      toast.error('Failed to add note', (e as Error).message)
    } finally { setNoteSaving(false) }
  }

  async function retryAction() {
    if (!selectedDetail) return
    try {
      await retryAdminOrder(selectedDetail.id)
      const refreshed = await jsonFetch<{ order: OrderDetailDto }>(`/api/admin/orders/${selectedDetail.id}`)
      setSelectedDetail(refreshed.order)
      toast.success('Retry queued', 'Internal note added — Phase 4H will dispatch to provider')
    } catch (e) { toast.error('Retry failed', (e as Error).message) }
  }

  const totalCount = useMemo(() => orders.length, [orders])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Manage</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Orders</h1>
          <p className="text-[13px] text-muted mt-1">{totalCount.toLocaleString()} orders match the current filters</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FilterStatus)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover"
        >
          {FILTER_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All status' : s.replace('_', ' ').toLowerCase()}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-secondary focus:outline-none focus:border-border-hover" />
        <span className="text-[11px] text-muted">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-secondary focus:outline-none focus:border-border-hover" />
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Order # or email"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {error && (
          <div className="px-5 py-3 border-b border-border bg-[rgba(255,45,120,0.06)] text-[12px] text-accent-pink">{error}</div>
        )}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                <th className="px-5 py-3 font-semibold">Order #</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold text-right">Total</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">No orders match the current filters.</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} onClick={() => setSelectedId(o.id)}
                  className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors cursor-pointer">
                  <td className="px-5 py-3 font-mono text-secondary">{o.orderNumber}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-primary">{o.customerName ?? '—'}</p>
                    <p className="text-muted text-[11px]">{o.customerEmail}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-secondary">{o.itemSummary}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-primary">${o.usdTotal.toFixed(2)}</td>
                  <td className="px-5 py-3"><StatusPill color={PILL_COLOR[o.status] ?? 'gray'}>{o.status.toLowerCase()}</StatusPill></td>
                  <td className="px-5 py-3 text-muted font-mono text-[11px]">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedId(o.id) }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-purple transition-all" title="View">
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSelectedId(o.id)} className="w-full text-left p-4 hover:bg-card-hover transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] truncate">{o.customerName ?? o.customerEmail}</p>
                  <p className="text-muted text-[11px] font-mono truncate">{o.orderNumber}</p>
                </div>
                <p className="font-bold text-[14px] text-gradient flex-shrink-0">${o.usdTotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted font-mono">
                <span>{o.itemSummary}</span>
                <StatusPill color={PILL_COLOR[o.status] ?? 'gray'}>{o.status.toLowerCase()}</StatusPill>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedDetail ? `Order ${selectedDetail.orderNumber}` : ''}
        width="560px"
      >
        {detailLoading ? (
          <div className="flex justify-center py-10">
            <span className="w-7 h-7 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
          </div>
        ) : !selectedDetail ? null : (
          <div className="flex flex-col gap-5 text-[13px]">
            <div className="flex items-center justify-between">
              <StatusPill color={PILL_COLOR[selectedDetail.status] ?? 'gray'}>{selectedDetail.status.toLowerCase()}</StatusPill>
              <p className="font-mono text-[11px] text-muted">{new Date(selectedDetail.createdAt).toLocaleString()}</p>
            </div>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Customer</p>
              <div className="bg-card border border-border rounded-xl p-4 space-y-1">
                <p className="font-semibold">{selectedDetail.customerName ?? '—'}</p>
                <p className="text-muted text-[12px]">{selectedDetail.customerEmail}</p>
                {selectedDetail.customerPhone && <p className="text-muted text-[12px]">{selectedDetail.customerPhone}</p>}
                {selectedDetail.user && (
                  <p className="text-[11px] text-muted font-mono mt-1">User id: {selectedDetail.user.id}</p>
                )}
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Items</p>
              <div className="flex flex-col gap-2">
                {selectedDetail.items.map((i) => (
                  <div key={i.id} className="bg-card border border-border rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{i.planName}</p>
                        <p className="text-muted text-[11px]">{i.data} · {i.days}d · {i.country ?? '—'}</p>
                        <p className="text-[10px] text-muted font-mono">{i.appliedRuleLabel ?? i.appliedRuleType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[14px] text-gradient">${(i.sellingPriceUsd * i.quantity).toFixed(2)}</p>
                        <p className="text-[10px] text-muted font-mono">cost ${i.costUsd.toFixed(2)} · profit ${i.profitUsd.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Payments</p>
              <div className="bg-card border border-border rounded-xl p-4">
                {selectedDetail.payments.length === 0 ? (
                  <p className="text-muted text-[12px]">No payments recorded.</p>
                ) : selectedDetail.payments.map((p) => (
                  <div key={p.id} className="flex justify-between py-1.5 border-b border-border last:border-none">
                    <span className="text-secondary">{p.providerSlug} · {p.method ?? '—'}</span>
                    <span className={p.status === 'SUCCESS' ? 'text-accent-green font-bold' : p.status === 'FAILED' ? 'text-accent-pink font-bold' : 'text-muted'}>
                      {p.status} · {p.currency} {p.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Timeline</p>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5">
                {selectedDetail.timeline.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent-purple mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-secondary"><strong>{ev.toStatus}</strong>{ev.fromStatus && ev.fromStatus !== ev.toStatus ? ` from ${ev.fromStatus}` : ''}</p>
                      {ev.reason && <p className="text-[11px] text-muted">{ev.reason}</p>}
                      <p className="text-[10px] text-muted font-mono">{ev.actorType} · {new Date(ev.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Transition</p>
              <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-2">
                {ALL_NEXT_STATUSES.filter((s) => s !== selectedDetail.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => transitionTo(s)}
                    className="px-3 py-1.5 rounded-md border border-border text-secondary text-[11px] font-mono hover:bg-card-hover hover:text-primary transition-all"
                  >
                    → {s.toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-2 inline-flex items-center gap-1.5">
                <XCircle size={11} className="text-accent-pink" /> Server rejects illegal transitions.
              </p>
            </section>

            <section>
              <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2 inline-flex items-center gap-1.5">
                <StickyNote size={11} /> Internal note
              </p>
              <div className="bg-card border border-border rounded-xl p-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a private note (visible to admins in the timeline)"
                  rows={3}
                  className="w-full bg-white/[0.04] border border-border rounded-lg p-2.5 text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover resize-y mb-2"
                />
                <button
                  onClick={submitNote}
                  disabled={!note.trim() || noteSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-60"
                >
                  <Send size={12} /> {noteSaving ? 'Saving…' : 'Add note'}
                </button>
              </div>
            </section>

            <div className="flex gap-2 pt-2">
              <button
                onClick={retryAction}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} /> Retry fulfilment
              </button>
              <button
                onClick={() => {
                  if (!confirm(`Refund ${selectedDetail!.orderNumber}? This moves the order to REFUNDED.`)) return
                  transitionTo('REFUNDED', 'Refund issued via admin console')
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-accent-pink/40 text-accent-pink text-[12px] font-bold hover:bg-accent-pink/[0.08] transition-all inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={12} /> Refund
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
