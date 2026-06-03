import StatusPill from '@/components/admin/StatusPill'

export type ServiceStatus = 'healthy' | 'warning' | 'offline'

type StatusMeta = {
  pill: 'green' | 'yellow' | 'red'
  dot: string
  label: string
  bar: string
}

const META: Record<ServiceStatus, StatusMeta> = {
  healthy: { pill: 'green',  dot: '#22c55e', label: 'Healthy', bar: 'rgba(34,197,94,0.6)' },
  warning: { pill: 'yellow', dot: '#eab308', label: 'Warning', bar: 'rgba(234,179,8,0.6)' },
  offline: { pill: 'red',    dot: '#ff2d78', label: 'Offline', bar: 'rgba(255,45,120,0.6)' },
}

type StatusCardProps = {
  name: string
  status: ServiceStatus
  /** Milliseconds; rendered as "—" when offline. */
  responseTimeMs: number
  lastChecked: string
}

/** Service health card with a status accent, response time, and last-checked time. */
export default function StatusCard({ name, status, responseTimeMs, lastChecked }: StatusCardProps) {
  const meta = META[status]
  const online = status !== 'offline'

  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden hover:border-border-hover transition-colors">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: meta.bar }} />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: meta.dot,
              boxShadow: online ? `0 0 8px ${meta.dot}` : 'none',
            }}
          />
          <h3 className="text-[14px] font-bold truncate">{name}</h3>
        </div>
        <StatusPill color={meta.pill}>{meta.label}</StatusPill>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">Response</p>
          <p className="text-[18px] font-extrabold font-mono">
            {online ? `${responseTimeMs}ms` : '—'}
          </p>
        </div>
        <p className="text-[11px] text-muted">Checked {lastChecked}</p>
      </div>
    </div>
  )
}
