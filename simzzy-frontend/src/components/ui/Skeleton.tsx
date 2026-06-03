import { cn } from '@/lib/utils'

/**
 * Shimmering placeholder block. Uses the `shimmer` keyframe from globals.css.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-md bg-white/[0.04] overflow-hidden relative', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
      }}
    />
  )
}

/** Plan/list card skeleton used by browse + dashboard loading states. */
export function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-[14px] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <div className="flex flex-col gap-2 py-3 border-t border-b border-border">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}
