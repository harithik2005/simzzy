import { cn } from '@/lib/utils'

type StatusColor = 'green' | 'yellow' | 'gray' | 'red' | 'purple'

const COLORS: Record<StatusColor, string> = {
  green:  'bg-accent-green/10  text-accent-green  border-accent-green/25',
  yellow: 'bg-yellow-500/10    text-yellow-400    border-yellow-500/25',
  gray:   'bg-card              text-muted         border-border',
  red:    'bg-accent-pink/10    text-accent-pink   border-accent-pink/25',
  purple: 'bg-accent-purple/10  text-accent-purple border-accent-purple/25',
}

type StatusPillProps = {
  color: StatusColor
  children: React.ReactNode
  className?: string
}

export default function StatusPill({ color, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border font-mono whitespace-nowrap',
        COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  )
}
