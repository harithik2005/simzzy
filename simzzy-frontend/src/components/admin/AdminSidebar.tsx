'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, CreditCard, Users, Settings, LogOut, X, Wallet, Star, HelpCircle, Tag, Activity, Plug, LifeBuoy, ScrollText } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
}

const NAV: NavItem[] = [
  { href: '/admin',              label: 'Dashboard',     icon: LayoutDashboard, exact: true },
  { href: '/admin/orders',       label: 'Orders',        icon: ShoppingBag },
  { href: '/admin/plans',        label: 'Plans',         icon: CreditCard },
  { href: '/admin/pricing',      label: 'Pricing Center', icon: Tag },
  { href: '/admin/users',        label: 'Users',         icon: Users },
  { href: '/admin/payments',     label: 'Payments',      icon: Wallet },
  { href: '/admin/providers',    label: 'Providers',     icon: Plug },
  { href: '/admin/reviews',      label: 'Reviews',       icon: Star },
  { href: '/admin/faqs',         label: 'FAQs',          icon: HelpCircle },
  { href: '/admin/support',      label: 'Support',       icon: LifeBuoy },
  { href: '/admin/audit',        label: 'Audit Log',     icon: ScrollText },
  { href: '/admin/system-health', label: 'System Health', icon: Activity },
  { href: '/admin/settings',     label: 'Settings',      icon: Settings },
]

type AdminSidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export default function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const path = usePathname()

  function handleLogout() {
    onClose()
    signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[240px] bg-mid border-r border-border flex flex-col',
          'transform transition-transform duration-300 ease-out',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-[18px] font-extrabold tracking-tight text-gradient">Simzzy</span>
            <span className="font-mono text-[9px] font-bold tracking-[2px] uppercase text-muted">
              Admin
            </span>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden text-muted hover:text-primary transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? path === item.href : path.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200',
                  active
                    ? 'bg-accent-purple/15 border border-accent-purple/20'
                    : 'text-secondary hover:bg-card-hover hover:text-primary border border-transparent',
                )}
              >
                <Icon size={17} className={active ? 'text-accent-pink' : ''} />
                {active ? <span className="text-gradient">{item.label}</span> : item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-secondary hover:bg-card-hover hover:text-primary transition-all duration-200"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
