'use client'

import { useEffect } from 'react'
import { useToastStore, type Toast } from '@/store/toast'
import { cn } from '@/lib/utils'

const ICON: Record<Toast['variant'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const ACCENT: Record<Toast['variant'], string> = {
  success: 'border-l-accent-green',
  error: 'border-l-accent-pink',
  info: 'border-l-accent-purple',
}

const ICON_BG: Record<Toast['variant'], string> = {
  success: 'bg-accent-green/15 text-accent-green',
  error: 'bg-accent-pink/15 text-accent-pink',
  info: 'bg-accent-purple/15 text-accent-purple',
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, dismiss])

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-[320px] max-w-[90vw] rounded-xl border border-l-4 border-border bg-mid/95 backdrop-blur px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)]',
        ACCENT[toast.variant],
      )}
      style={{ animation: 'scaleIn 0.2s ease' }}
    >
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
          ICON_BG[toast.variant],
        )}
      >
        {ICON[toast.variant]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-primary">{toast.title}</p>
        {toast.description && (
          <p className="text-[12px] text-secondary mt-0.5 leading-snug">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="text-muted hover:text-primary transition-colors text-[14px] leading-none"
      >
        ✕
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}
