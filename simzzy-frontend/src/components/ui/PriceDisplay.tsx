'use client'

import { useCurrency } from '@/context/currency'
import { formatUsd } from '@/lib/currency'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<Size, { local: string; usd: string }> = {
  sm: { local: 'text-[16px] font-bold',      usd: 'text-[10px]' },
  md: { local: 'text-[22px] font-extrabold',  usd: 'text-[11px]' },
  lg: { local: 'text-[28px] font-extrabold',  usd: 'text-[12px]' },
  xl: { local: 'text-[34px] font-extrabold',  usd: 'text-[13px]' },
}

type Props = {
  /** Base price in USD; converted to the visitor's local currency for display. */
  usd: number
  size?: Size
  /** e.g. "/plan" rendered next to the primary price. */
  suffix?: string
  className?: string
  /** Lay the USD reference inline (default) or stacked below the local price. */
  inline?: boolean
}

/**
 * Primary price in the visitor's local currency (large) with the USD reference
 * (small, muted) alongside. When the local currency is USD, only one line shows.
 */
export function PriceDisplay({ usd, size = 'md', suffix, className, inline = false }: Props) {
  const { code, format } = useCurrency()
  const isUsd = code === 'USD'
  const s = SIZE[size]

  return (
    <div
      className={cn(
        'flex',
        inline ? 'items-baseline gap-2' : 'flex-col',
        className,
      )}
    >
      <span className="flex items-baseline gap-1 tracking-tight">
        <span className={s.local}>{format(usd)}</span>
        {suffix && <span className="text-[11px] text-muted font-medium">{suffix}</span>}
      </span>
      {!isUsd && (
        <span className={cn('text-muted font-medium', s.usd)}>{formatUsd(usd)} USD</span>
      )}
    </div>
  )
}
