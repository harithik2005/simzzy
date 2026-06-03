import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type RevenueCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  /** Tailwind text-color class for the value (e.g. 'text-accent-green'). */
  accent?: string
  trend?: { value: string; positive?: boolean }
}

/**
 * Generic glass stat card. Reused for pricing statistics, revenue snapshot,
 * order health, and tSIM monitoring figures.
 */
export default function RevenueCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'text-primary',
  trend,
}: RevenueCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden hover:border-border-hover transition-colors">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />

      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</p>
        {Icon && (
          <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent-purple/12 text-accent-purple flex-shrink-0">
            <Icon size={14} />
          </span>
        )}
      </div>

      <p className={cn('text-[22px] font-extrabold mt-2 tracking-tight truncate', accent)}>{value}</p>

      {(sub || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className={cn('text-[11px] font-bold', trend.positive ? 'text-accent-green' : 'text-accent-pink')}>
              {trend.positive ? '▲' : '▼'} {trend.value}
            </span>
          )}
          {sub && <span className="text-[11px] text-muted">{sub}</span>}
        </div>
      )}
    </div>
  )
}
