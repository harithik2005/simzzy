'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, LogOut, Gauge } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { NAV_LINKS } from '@/lib/constants'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()

  const authed = status === 'authenticated'
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  function handleLogout() {
    setMobileOpen(false)
    signOut({ callbackUrl: '/' })
  }

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 border-b border-border"
      style={{
        background: 'rgba(10,0,24,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-gradient text-2xl font-bold tracking-tight shrink-0">
          Simzzy
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-secondary hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {authed ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 text-sm text-white px-4 py-2 rounded-lg bg-gradient-btn hover:opacity-90 transition-all duration-200"
                >
                  <Gauge className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-primary border border-border px-4 py-2 rounded-lg hover:border-border-hover hover:bg-card transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-sm text-secondary px-3 py-2 rounded-lg hover:text-primary hover:bg-card transition-all duration-200"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-secondary px-3 py-2 rounded-lg hover:text-primary transition-all duration-200"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm text-white px-4 py-2 rounded-lg bg-gradient-btn hover:opacity-90 transition-all duration-200"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-primary rounded-lg hover:bg-card transition-colors"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-border"
          style={{ background: 'rgba(10,0,24,0.95)' }}
        >
          <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-secondary hover:text-primary transition-colors py-3 border-b border-border last:border-none"
              >
                {link.label}
              </Link>
            ))}

            {authed ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm text-center text-white px-4 py-2.5 rounded-lg bg-gradient-btn hover:opacity-90 transition-all duration-200"
                  >
                    <Gauge className="w-4 h-4" />
                    Admin Panel
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 text-sm text-center text-primary border border-border px-4 py-2.5 rounded-lg hover:border-border-hover hover:bg-card transition-all duration-200"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="mt-2 text-sm text-center text-secondary px-4 py-2.5 rounded-lg hover:text-primary hover:bg-card transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 text-sm text-center text-primary border border-border px-4 py-2.5 rounded-lg hover:border-border-hover hover:bg-card transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 text-sm text-center text-white px-4 py-2.5 rounded-lg bg-gradient-btn hover:opacity-90 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
