import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SidebarProps extends HTMLAttributes<HTMLElement> {
  open?: boolean
}

export function Sidebar({ open = false, className, children, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 bg-mid border-r border-border',
        'transform transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
}
