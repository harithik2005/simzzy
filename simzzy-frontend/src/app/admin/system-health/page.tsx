'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { fetchHealth, type SystemHealthReport } from '@/lib/admin-client'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string, { color: string; icon: typeof CheckCircle2; label: string; bg: string; border: string }> = {
  HEALTHY:  { color: 'text-accent-green', icon: CheckCircle2, label: 'Healthy',  bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)' },
  WARNING:  { color: 'text-yellow-400',   icon: AlertTriangle, label: 'Warning',  bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)' },
  CRITICAL: { color: 'text-accent-pink',  icon: XCircle,       label: 'Critical', bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.3)' },
}

export default function AdminSystemHealthPage() {
  const [report, setReport] = useState<SystemHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetchHealth()
      setReport(r)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to run health checks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function refresh() {
    try {
      const r = await fetchHealth()
      setReport(r)
      toast.success('Status refreshed', `All services re-checked`)
    } catch (e) { toast.error('Refresh failed', (e as Error).message) }
  }

  const aggregate = report?.status ?? 'HEALTHY'
  const aggStyle = STATUS_STYLE[aggregate]
  const AggIcon = aggStyle.icon

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">Monitoring</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">System Health</h1>
          <p className="text-[13px] text-muted mt-1">
            Live status of every service Simzzy depends on.
            {report && <> Last checked {new Date(report.generatedAt).toLocaleTimeString()}.</>}
          </p>
        </div>
        <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary disabled:opacity-60">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Aggregate */}
          <div
            className="rounded-2xl p-5 flex items-center justify-between border"
            style={{ background: aggStyle.bg, borderColor: aggStyle.border }}
          >
            <div className="flex items-center gap-3">
              <AggIcon className={cn('w-7 h-7', aggStyle.color)} />
              <div>
                <p className={cn('text-[16px] font-extrabold', aggStyle.color)}>
                  Overall: {aggStyle.label}
                </p>
                <p className="text-[12px] text-muted">
                  {report.services.filter((s) => s.status === 'HEALTHY').length} healthy ·{' '}
                  {report.services.filter((s) => s.status === 'WARNING').length} warning ·{' '}
                  {report.services.filter((s) => s.status === 'CRITICAL').length} critical
                </p>
              </div>
            </div>
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.services.map((s) => {
              const style = STATUS_STYLE[s.status]
              const Icon = style.icon
              return (
                <div key={s.id} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-[2px]"
                    style={{ background: style.color.includes('green') ? '#22c55e' : style.color.includes('pink') ? '#ff2d78' : '#eab308' }} />
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div>
                      <p className="text-[14px] font-bold">{s.name}</p>
                      <p className="text-[11px] text-muted font-mono mt-0.5">{s.category}</p>
                    </div>
                    <Icon className={cn('w-5 h-5', style.color)} />
                  </div>
                  <p className="text-[12px] text-secondary mb-3">{s.message}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                    <span>{new Date(s.checkedAt).toLocaleTimeString()}</span>
                    {s.responseTimeMs !== null && <span>{s.responseTimeMs} ms</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!report && loading && (
        <div className="min-h-[30vh] flex items-center justify-center">
          <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        </div>
      )}
    </div>
  )
}
