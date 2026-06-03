'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, Power, RefreshCcwDot } from 'lucide-react'
import {
  fetchAdminPlans,
  setAdminPlanActive,
  prepareAdminPlanSync,
  type AdminPlanDto,
  type PlanFilterOptions,
  type SyncPreparationDto,
} from '@/lib/admin-client'
import Modal from '@/components/admin/Modal'
import StatusPill from '@/components/admin/StatusPill'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

function marginColor(pct: number | null): string {
  if (pct === null) return 'text-muted'
  if (pct > 30) return 'text-accent-green'
  if (pct >= 15) return 'text-yellow-400'
  return 'text-accent-pink'
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlanDto[]>([])
  const [options, setOptions] = useState<PlanFilterOptions>({ providers: [], regions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [providerId, setProviderId] = useState('')
  const [regionId, setRegionId] = useState('')
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all')

  const [syncProvider, setSyncProvider] = useState('')
  const [syncReport, setSyncReport] = useState<SyncPreparationDto | null>(null)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async (filters: { q: string; providerId: string; regionId: string; active: 'all' | 'true' | 'false' }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminPlans({
        q: filters.q || undefined,
        providerId: filters.providerId || undefined,
        regionId: filters.regionId || undefined,
        active: filters.active === 'all' ? undefined : filters.active === 'true',
      })
      setPlans(data.plans)
      setOptions(data.options)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load({ q: search, providerId, regionId, active }), 250)
    return () => clearTimeout(t)
  }, [search, providerId, regionId, active, load])

  async function toggleActive(p: AdminPlanDto) {
    try {
      const updated = await setAdminPlanActive(p.id, !p.isActive)
      setPlans((prev) => prev.map((x) => (x.id === p.id ? updated : x)))
      toast.success(`${p.name} ${updated.isActive ? 'enabled' : 'disabled'}`)
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }

  async function runSyncPrep() {
    if (!syncProvider) { toast.error('Pick a provider first'); return }
    setSyncing(true)
    try {
      setSyncReport(await prepareAdminPlanSync(syncProvider))
    } catch (e) {
      toast.error('Sync preparation failed', (e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
            Catalog
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Plans</h1>
          <p className="text-[13px] text-muted mt-1">{plans.length} plans · synced from providers</p>
        </div>
        <button
          onClick={() => load({ q: search, providerId, regionId, active })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error} — <button onClick={() => load({ q: search, providerId, regionId, active })} className="underline">retry</button>
        </div>
      )}

      {/* Sync preparation */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink">Provider sync</p>
        <select
          value={syncProvider}
          onChange={(e) => { setSyncProvider(e.target.value); setSyncReport(null) }}
          className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover"
        >
          <option value="">Select provider…</option>
          {options.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={runSyncPrep}
          disabled={syncing || !syncProvider}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent-purple text-accent-purple text-[12px] font-bold hover:bg-accent-purple/10 transition-all disabled:opacity-50"
        >
          <RefreshCcwDot size={13} className={syncing ? 'animate-spin' : ''} /> Prepare sync
        </button>
        <span className="text-[11px] text-muted">Dry-run readiness check — live tSIM sync lands in Phase 4H.</span>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-10 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Plan name, code or country"
            className="w-full pl-9 pr-3 py-2 bg-mid border border-border rounded-lg text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
          />
        </div>
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          <option value="">All providers</option>
          {options.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          <option value="">All regions</option>
          {options.regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value as typeof active)} className="bg-mid border border-border rounded-lg px-3 py-2 text-[12px] text-primary focus:outline-none focus:border-border-hover">
          <option value="all">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Plans table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted font-mono uppercase tracking-widest text-[10px] border-b border-border">
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Provider</th>
                <th className="px-5 py-3 font-semibold">Region</th>
                <th className="px-5 py-3 font-semibold">Data</th>
                <th className="px-5 py-3 font-semibold">Days</th>
                <th className="px-5 py-3 font-semibold text-right">Cost</th>
                <th className="px-5 py-3 font-semibold text-right">Price</th>
                <th className="px-5 py-3 font-semibold text-right">Margin</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-card-hover transition-colors">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-[18px] leading-none">{p.primaryCountryFlag ?? '🌍'}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-primary truncate">{p.name}</span>
                        <span className="block text-[10px] text-muted font-mono">{p.esimId}{p.hasOverride && ' · override'}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-secondary">{p.providerName}</td>
                  <td className="px-5 py-3 text-secondary">{p.regionName}</td>
                  <td className="px-5 py-3 text-secondary">{p.data}</td>
                  <td className="px-5 py-3 text-secondary">{p.days}</td>
                  <td className="px-5 py-3 text-right text-muted font-mono">${p.costUsd.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-bold text-primary font-mono">{p.sellingPriceUsd !== null ? `$${p.sellingPriceUsd.toFixed(2)}` : '—'}</td>
                  <td className={cn('px-5 py-3 text-right font-bold font-mono', marginColor(p.marginPct))}>
                    {p.marginPct !== null ? `${p.marginPct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(p)}
                      className={cn('relative w-10 h-5 rounded-full transition-colors', p.isActive ? 'bg-accent-purple' : 'bg-border')}
                      aria-label="Toggle active"
                      title={p.isActive ? 'Disable' : 'Enable'}
                    >
                      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', p.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted text-[13px]">
                    {loading ? 'Loading…' : 'No plans in the catalog yet. Seed plans or run a provider sync.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border">
          {plans.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[24px] leading-none">{p.primaryCountryFlag ?? '🌍'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-[11px] text-muted font-mono">{p.providerName} · {p.data} · {p.days}d</p>
                </div>
                <button
                  onClick={() => toggleActive(p)}
                  className={cn('relative w-10 h-5 rounded-full transition-colors flex-shrink-0', p.isActive ? 'bg-accent-purple' : 'bg-border')}
                  aria-label="Toggle active"
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', p.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div><p className="text-muted uppercase tracking-wider">Cost</p><p className="font-bold text-secondary">${p.costUsd.toFixed(2)}</p></div>
                <div><p className="text-muted uppercase tracking-wider">Price</p><p className="font-bold text-primary">{p.sellingPriceUsd !== null ? `$${p.sellingPriceUsd.toFixed(2)}` : '—'}</p></div>
                <div><p className="text-muted uppercase tracking-wider">Margin</p><p className={cn('font-bold', marginColor(p.marginPct))}>{p.marginPct !== null ? `${p.marginPct.toFixed(1)}%` : '—'}</p></div>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="px-5 py-12 text-center text-muted text-[13px]">{loading ? 'Loading…' : 'No plans in the catalog yet.'}</p>
          )}
        </div>
      </div>

      {/* Sync prep result */}
      <Modal open={!!syncReport} onClose={() => setSyncReport(null)} title="Sync preparation" width="480px">
        {syncReport && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <StatusPill color={syncReport.ready ? 'green' : 'red'}>{syncReport.ready ? 'ready' : 'not ready'}</StatusPill>
              <span className="text-[14px] font-bold">{syncReport.providerName}</span>
            </div>
            <p className="text-[13px] text-secondary leading-relaxed">{syncReport.message}</p>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div><p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">Total plans</p><p className="font-bold text-primary">{syncReport.totalPlans}</p></div>
              <div><p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">Active plans</p><p className="font-bold text-primary">{syncReport.activePlans}</p></div>
              <div className="col-span-2"><p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">Last synced</p><p className="font-mono text-secondary">{syncReport.lastSyncedAt ? new Date(syncReport.lastSyncedAt).toLocaleString() : 'never'}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
