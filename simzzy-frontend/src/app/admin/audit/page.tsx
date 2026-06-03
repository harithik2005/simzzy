'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { fetchAuditLog, type AuditLogEntryDto } from '@/lib/admin-client'

/**
 * Admin Audit Center. Cross-entity view of every administrative change
 * (pricing, providers, users, orders, support…). The pricing audit table
 * on /admin/pricing remains as the focused view for that domain.
 */

const ACTOR_COLOR: Record<string, string> = {
  ADMIN:    'text-accent-purple',
  SYSTEM:   'text-muted',
  USER:     'text-secondary',
  PROVIDER: 'text-accent-pink',
}

function entityLabel(entity: string): string {
  switch (entity) {
    case 'PricingGlobalRule':   return 'Pricing · global rule'
    case 'PricingCountryRule':  return 'Pricing · country rule'
    case 'PricingDurationRule': return 'Pricing · duration rule'
    case 'PlanPriceOverride':   return 'Pricing · plan override'
    case 'EsimProvider':        return 'Provider · eSIM'
    case 'PaymentProvider':     return 'Provider · payment'
    case 'SupportTicket':       return 'Support · ticket'
    case 'User':                return 'User'
    case 'Order':               return 'Order'
    default:                    return entity
  }
}

function summarise(after: unknown, before: unknown): string {
  const obj = (after ?? before) as Record<string, unknown> | null
  if (!obj || typeof obj !== 'object') return '—'
  if ('profitUsd' in obj) return `+$${(obj as { profitUsd: number }).profitUsd}`
  if ('fixedPriceUsd' in obj) return `$${(obj as { fixedPriceUsd: number }).fixedPriceUsd}`
  if ('status' in obj) return String((obj as { status: string }).status)
  if ('role' in obj) return String((obj as { role: string }).role)
  return JSON.stringify(obj).slice(0, 60)
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntryDto[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [entity, setEntity] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchAuditLog({
        entity: entity || undefined,
        q: q.trim() || undefined,
        dateFrom: from || undefined,
        dateTo: to || undefined,
      }, 200)
      setEntries(data.entries)
      setEntities(data.entities)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load audit log')
    } finally { setLoading(false) }
  }, [entity, q, from, to])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Forensics</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Audit Log</h1>
          <p className="text-[13px] text-muted mt-1">
            Every pricing, provider, user, and support change. {entries.length} entries shown.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <select value={entity} onChange={(e) => setEntity(e.target.value)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          <option value="">All entities</option>
          {entities.map((e) => <option key={e} value={e}>{entityLabel(e)}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-secondary" />
        <span className="text-[11px] text-muted">—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-secondary" />
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Actor name or email"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {error && (
          <div className="px-5 py-3 border-b border-border bg-[rgba(255,45,120,0.06)] text-[12px] text-accent-pink">{error}</div>
        )}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Entity</th>
                <th className="px-5 py-3 font-semibold">After</th>
                <th className="px-5 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">Loading…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No audit entries match.</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors">
                  <td className="px-5 py-3 text-muted font-mono text-[11px]">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <p className={`font-semibold ${ACTOR_COLOR[e.actorType] ?? 'text-secondary'}`}>
                      {e.actor?.name ?? e.actor?.email ?? e.actorType.toLowerCase()}
                    </p>
                    {e.actor && <p className="text-muted text-[11px]">{e.actor.email}</p>}
                  </td>
                  <td className="px-5 py-3 font-mono text-secondary">{e.action}</td>
                  <td className="px-5 py-3 text-secondary">{entityLabel(e.entity)}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-muted truncate max-w-[200px]" title={JSON.stringify(e.after)}>
                    {summarise(e.after, e.before)}
                  </td>
                  <td className="px-5 py-3 text-muted font-mono text-[11px]">{e.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
