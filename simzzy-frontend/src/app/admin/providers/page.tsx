'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Power, RefreshCw, AlertTriangle, CheckCircle2, Lock } from 'lucide-react'
import { toast } from '@/store/toast'
import StatusPill from '@/components/admin/StatusPill'
import {
  fetchProviders,
  setEsimProviderStatus,
  setPaymentProviderStatus,
  type EsimProviderDto,
  type PaymentProviderDto,
} from '@/lib/admin-client'

/**
 * Admin provider dashboard.
 *
 * Operational view of every external provider configured in the database.
 * Credentials (API keys, tokens) NEVER appear here — only a `credentialRef`
 * pointing at the secret store. Toggle activates/deactivates a provider; the
 * customer storefront stops routing orders through an INACTIVE provider.
 */

const STATUS_COLOR: Record<string, 'green' | 'red'> = { ACTIVE: 'green', INACTIVE: 'red' }

export default function AdminProvidersPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [esim, setEsim] = useState<EsimProviderDto[]>([])
  const [payment, setPayment] = useState<PaymentProviderDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProviders()
      setEsim(data.esim)
      setPayment(data.payment)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function toggleEsim(p: EsimProviderDto) {
    try {
      await setEsimProviderStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
      toast.success(`${p.name} ${p.status === 'ACTIVE' ? 'disabled' : 'enabled'}`)
      load()
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }
  async function togglePayment(p: PaymentProviderDto) {
    try {
      await setPaymentProviderStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
      toast.success(`${p.name} ${p.status === 'ACTIVE' ? 'disabled' : 'enabled'}`)
      load()
    } catch (e) { toast.error('Update failed', (e as Error).message) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Integrations</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Providers</h1>
          <p className="text-[13px] text-muted mt-1">
            Toggle eSIM suppliers and payment gateways. Credentials never appear here — only references.
            {!isSuperAdmin && <span className="inline-flex items-center gap-1 ml-1 text-accent-pink"><Lock size={11} /> view-only — provider changes require SUPER_ADMIN.</span>}
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error}
        </div>
      )}

      <section>
        <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-3">eSIM providers</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {esim.length === 0 && !loading ? (
            <p className="text-muted text-[13px]">No eSIM providers configured.</p>
          ) : esim.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold truncate">{p.name}</p>
                  <p className="text-[11px] text-muted font-mono mt-0.5">slug: {p.slug}</p>
                </div>
                <StatusPill color={STATUS_COLOR[p.status]}>{p.status.toLowerCase()}</StatusPill>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12px] mb-4">
                <Stat label="Active plans" value={p.activePlanCount} />
                <Stat label="Total plans" value={p.totalPlanCount} />
                <Stat label="Last sync" value={p.lastSyncedAt ? new Date(p.lastSyncedAt).toLocaleString() : '—'} mono />
                <Stat label="Sync errors" value={p.errorCount} accent={p.errorCount > 0 ? 'pink' : 'muted'} />
              </div>
              <div className="text-[11px] text-muted font-mono mb-4 truncate">
                credentialRef: <span className="text-secondary">{p.credentialRef ?? '— (not yet configured)'}</span>
              </div>
              <button
                onClick={() => toggleEsim(p)}
                disabled={!isSuperAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <Power size={13} /> {p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
              </button>
              {p.slug === 'tsim' && (
                <p className="mt-3 text-[11px] text-muted">
                  <AlertTriangle size={11} className="inline mr-1 text-accent-pink" /> Live tSIM ordering lands in Phase 4H.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-3">Payment gateways</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payment.length === 0 && !loading ? (
            <p className="text-muted text-[13px]">No payment providers configured.</p>
          ) : payment.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold truncate">
                    {p.name}
                    {p.isDefault && <span className="ml-2 text-[10px] font-mono uppercase text-accent-purple">default</span>}
                  </p>
                  <p className="text-[11px] text-muted font-mono mt-0.5">slug: {p.slug}</p>
                </div>
                <StatusPill color={STATUS_COLOR[p.status]}>{p.status.toLowerCase()}</StatusPill>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12px] mb-4">
                <Stat label="Successful" value={p.successfulPayments} accent="green" />
                <Stat label="Failed" value={p.failedPayments} accent={p.failedPayments > 0 ? 'pink' : 'muted'} />
              </div>
              <div className="text-[11px] text-muted font-mono mb-4 truncate">
                credentialRef: <span className="text-secondary">{p.credentialRef ?? '— (not yet configured)'}</span>
              </div>
              <button
                onClick={() => togglePayment(p)}
                disabled={!isSuperAdmin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <Power size={13} /> {p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
              </button>
              {p.slug === 'eximpe' && (
                <p className="mt-3 text-[11px] text-muted">
                  <CheckCircle2 size={11} className="inline mr-1 text-accent-green" /> EximPe integration lands in a later phase.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, mono, accent }: { label: string; value: number | string; mono?: boolean; accent?: 'green' | 'pink' | 'muted' }) {
  const color = accent === 'green' ? 'text-accent-green' : accent === 'pink' ? 'text-accent-pink' : accent === 'muted' ? 'text-muted' : 'text-primary'
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">{label}</p>
      <p className={`${mono ? 'font-mono' : ''} font-semibold ${color}`}>{value}</p>
    </div>
  )
}
