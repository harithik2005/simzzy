'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronDown, LogOut, Menu, Search, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { notifications } from '@/data/adminMock'

type AdminTopbarProps = {
  onMenuClick: () => void
}

function initialsFrom(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.split('@')[0] || 'Admin'
  return source.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A'
}

export default function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const { data: session } = useSession()
  const [bellOpen, setBellOpen]       = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const bellRef    = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((n) => n.unread).length

  const admin = {
    name: session?.user?.name ?? 'Admin',
    email: session?.user?.email ?? '',
    role: (session?.user?.role ?? 'ADMIN').replace('_', ' '),
    initials: initialsFrom(session?.user?.name, session?.user?.email),
  }

  function handleLogout() {
    setProfileOpen(false)
    // Redirect via the browser origin so logout never lands on localhost.
    signOut({ redirect: false }).then(() => { window.location.href = '/login' })
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node))       setBellOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <header className="sticky top-0 z-20 h-16 bg-mid/85 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 md:px-6">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-secondary hover:text-primary transition-colors p-1"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search orders, users, plans..."
          className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover transition-colors"
        />
      </div>

      {/* Notifications */}
      <div className="relative" ref={bellRef}>
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:bg-card-hover hover:text-primary transition-all"
          aria-label="Notifications"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-pink rounded-full ring-2 ring-mid" />
          )}
        </button>

        {bellOpen && (
          <div className="absolute right-0 top-12 w-[340px] bg-mid border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[13px] font-bold">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-accent-pink">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-4 py-3 border-b border-border last:border-b-0 hover:bg-card-hover transition-colors cursor-pointer flex gap-3',
                    n.unread && 'bg-card/50',
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        n.unread ? 'bg-accent-pink' : 'bg-border',
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-primary">{n.title}</p>
                    <p className="text-[12px] text-secondary mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted mt-1 font-mono">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/admin/orders"
              onClick={() => setBellOpen(false)}
              className="block w-full text-center py-2.5 text-[12px] font-semibold text-accent-purple hover:bg-card-hover transition-colors"
            >
              View all
            </Link>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card-hover transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-btn flex items-center justify-center text-[11px] font-bold text-white">
            {admin.initials}
          </div>
          <span className="hidden md:block text-[13px] font-semibold text-primary">
            {admin.name}
          </span>
          <ChevronDown size={14} className="hidden md:block text-muted" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-56 bg-mid border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[13px] font-bold text-primary">{admin.name}</p>
              <p className="text-[11px] text-muted mt-0.5">{admin.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-accent-purple/15 text-accent-purple rounded">
                {admin.role}
              </span>
            </div>
            <div className="p-1.5">
              <Link
                href="/admin/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-secondary hover:bg-card-hover hover:text-primary transition-all"
              >
                <User size={15} />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-secondary hover:bg-card-hover hover:text-primary transition-all"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
