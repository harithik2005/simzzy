'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

export type QuickAction = {
  id: string
  label: string
  icon: LucideIcon
  successTitle: string
  successDescription?: string
  /** Optional side-effect to run on success (e.g. refresh local state). */
  onRun?: () => void
}

type QuickActionPanelProps = {
  title?: string
  actions: QuickAction[]
  /** Simulated work duration in ms before success. */
  durationMs?: number
}

/**
 * Renders a grid of admin action buttons. Each click simulates async work,
 * then fires a success toast — swap the timeout for a real API call later.
 */
export default function QuickActionPanel({
  title = 'Quick Actions',
  actions,
  durationMs = 1200,
}: QuickActionPanelProps) {
  const [running, setRunning] = useState<string | null>(null)

  function run(action: QuickAction) {
    if (running) return
    setRunning(action.id)
    setTimeout(() => {
      action.onRun?.()
      toast.success(action.successTitle, action.successDescription)
      setRunning(null)
    }, durationMs)
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
      <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">
        {title}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon
          const isRunning = running === action.id
          return (
            <button
              key={action.id}
              onClick={() => run(action)}
              disabled={!!running}
              className={cn(
                'flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border text-[12px] font-semibold transition-all duration-200',
                'border-border bg-white/[0.02] text-secondary',
                'hover:bg-card-hover hover:text-primary hover:border-border-hover hover:-translate-y-0.5',
                'disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed',
              )}
            >
              {isRunning ? (
                <span className="w-[18px] h-[18px] rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
              ) : (
                <Icon size={18} className="text-accent-purple" />
              )}
              <span className="text-center leading-tight">
                {isRunning ? 'Working…' : action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
