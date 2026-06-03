'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, CheckCircle2, DollarSign, LifeBuoy, ShoppingBag,
  Users, Wifi, RefreshCw, ArrowRight,
} from 'lucide-react'
import { fetchAdminDashboard, type AdminDashboardSummary } from '@/lib/admin-client'
import { toast } from '@/store/toast'

/**
 * Admin home — live data from /api/admin/dashboard.
 *
 * Each tile links to its own page. No mock data anywhere; if the API fails the
 * page surfaces an error + retry rather than rendering zeroes silently.
 */

function Tile({
  icon: Icon, label, value, sub, href, accent,
}: {
  icon: typeof Users
  label: string
  value: string | number
  sub?: string
  href: string
  accent?: 'green' | 'pink' | 'purple'
}) {
  const dotColor =
    accent === 'green' ? 'text-accent-green' :
    accent === 'pink'  ? 'text-accent-pink'  : 'text-accent-purple'
  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-2xl p-5 hover:border-border-hover hover:bg-card-hover transition-all relative overflow-hidden block"
    >
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center">
          <Icon size={18} className={dotColor} />
        </div>
        <ArrowRight size={14} className="text-muted" />
      </div>
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-1.5">{label}</p>
      <p className="text-2xl font-extrabold text-gradient">{value}</p>
      {sub && <p className="text-[11px] text-muted mt-1 font-mono">{sub}</p>}
    </Link>
  )
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await fetchAdminDashboard())
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Overview</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Operations Center</h1>
          <p className="text-[13px] text-muted mt-1">Live view of users, orders, revenue, and providers.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary disabled:opacity-60">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error} — <button onClick={load} className="underline">retry</button>
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile
              icon={Users}
              label="Total users"
              value={summary.users.total.toLocaleString()}
              sub={`${summary.users.active.toLocaleString()} active · +${summary.users.newLast7Days} this week`}
              href="/admin/users"
              accent="purple"
            />
            <Tile
              icon={ShoppingBag}
              label="Orders"
              value={summary.orders.total.toLocaleString()}
              sub={`${summary.orders.last7Days} in last 7d · ${summary.orders.completed} completed`}
              href="/admin/orders"
            />
            <Tile
              icon={DollarSign}
              label="Revenue (lifetime)"
              value={`$${summary.revenue.totalUsd.toFixed(2)}`}
              sub={`30d: $${summary.revenue.last30dUsd.toFixed(2)} · 7d: $${summary.revenue.last7dUsd.toFixed(2)}`}
              href="/admin/orders"
              accent="green"
            />
            <Tile
              icon={Wifi}
              label="Active plans"
              value={summary.plans.active.toLocaleString()}
              sub={`${summary.plans.total} total in catalog`}
              href="/admin/plans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile
              icon={AlertTriangle}
              label="Failures + cancels"
              value={(summary.orders.failed + summary.orders.cancelled).toLocaleString()}
              sub={`${summary.orders.failed} failed · ${summary.orders.cancelled} cancelled · ${summary.orders.refunded} refunded`}
              href="/admin/orders?status=FAILED"
              accent="pink"
            />
            <Tile
              icon={LifeBuoy}
              label="Open tickets"
              value={(summary.tickets.open + summary.tickets.inProgress).toLocaleString()}
              sub={`${summary.tickets.open} open · ${summary.tickets.inProgress} in progress`}
              href="/admin/support"
              accent="pink"
            />
            <Tile
              icon={CheckCircle2}
              label="eSIM providers"
              value={summary.providers.esimActive}
              sub="active integrations"
              href="/admin/providers"
              accent="green"
            />
            <Tile
              icon={CheckCircle2}
              label="Payment providers"
              value={summary.providers.paymentActive}
              sub="active gateways"
              href="/admin/providers"
              accent="green"
            />
          </div>

          {/* Order breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[14px] font-bold">Order pipeline</p>
                <p className="text-[11px] text-muted mt-0.5 font-mono">Counts by current status</p>
              </div>
              <Link href="/admin/orders" className="text-[12px] font-semibold text-accent-purple hover:text-accent-pink transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {[
                ['Pending',     summary.orders.pending,    'text-accent-pink'],
                ['In progress', summary.orders.inProgress, 'text-accent-purple'],
                ['Completed',   summary.orders.completed,  'text-accent-green'],
                ['Failed',      summary.orders.failed,     'text-accent-pink'],
                ['Cancelled',   summary.orders.cancelled,  'text-muted'],
                ['Refunded',    summary.orders.refunded,   'text-muted'],
              ].map(([label, value, color]) => (
                <div key={label as string} className="p-3 rounded-lg border border-border bg-mid">
                  <p className={`text-2xl font-extrabold ${color}`}>{Number(value).toLocaleString()}</p>
                  <p className="text-[11px] text-muted font-mono uppercase tracking-widest mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!summary && loading && (
        <div className="min-h-[30vh] flex items-center justify-center">
          <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        </div>
      )}

      {/* Operations cheatsheet */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-[14px] font-bold mb-3">Operations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { href: '/admin/users',         label: 'Users' },
            { href: '/admin/orders',        label: 'Orders' },
            { href: '/admin/pricing',       label: 'Pricing Center' },
            { href: '/admin/providers',     label: 'Providers' },
            { href: '/admin/support',       label: 'Support queue' },
            { href: '/admin/audit',         label: 'Audit log' },
            { href: '/admin/system-health', label: 'System health' },
            { href: '/admin/plans',         label: 'Plans (catalog)' },
          ].map((l) => (
            <Link key={l.href} href={l.href}
              className="block p-3 rounded-lg border border-border text-[13px] text-secondary hover:bg-card-hover hover:text-primary transition-all"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* Hard-coded helper note for SUPER_ADMIN affordances will be discoverable via /admin/users role drop-down. */}
      <p className="text-[11px] text-muted text-center">
        Role escalations (USER → ADMIN → SUPER_ADMIN) require a SUPER_ADMIN account. Toast errors will surface 403 if you lack permission.
      </p>

      {error && summary === null && (
        <div className="text-center py-10">
          <button onClick={load} className="px-4 py-2 rounded-lg border border-border text-secondary text-[13px] hover:text-primary">Retry</button>
        </div>
      )}

      {/* Toast acks (no-op import to retain dependency) */}
      <span className="hidden" aria-hidden>{toast ? '' : null}</span>
    </div>
  )
}
