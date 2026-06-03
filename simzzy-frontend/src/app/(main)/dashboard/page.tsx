'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { toast } from '@/store/toast'
import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  changePassword,
  fetchDashboard,
  fetchMyEsims,
  fetchMyOrders,
  fetchPreferences,
  fetchProfile,
  updatePreferences,
  updateProfile,
  type AccountEsimDto,
  type AccountOrderDto,
  type DashboardSummaryDto,
  type PreferencesDto,
  type ProfileDto,
} from '@/lib/account-client'

/* ─── Tabs ──────────────────────────────────────────────────────────────── */

type Tab = 'orders' | 'esims' | 'profile' | 'settings'
const TABS: Tab[] = ['orders', 'esims', 'profile', 'settings']

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const INPUT_CLASS =
  'w-full px-4 py-3 text-sm rounded-[10px] outline-none transition-all duration-300 bg-white/[0.04] text-primary placeholder:text-muted border border-border focus:border-accent-purple focus:bg-white/[0.06]'

function memberSinceLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  PENDING:            { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: '◷ Pending' },
  PAYMENT_PROCESSING: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: '◷ Payment processing' },
  PAYMENT_SUCCESS:    { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', label: '✓ Paid' },
  ORDER_SUBMITTED:    { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: '◷ Submitted' },
  QR_PENDING:         { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: '◷ QR pending' },
  QR_RECEIVED:        { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', label: '✓ Ready' },
  DELIVERED:          { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', label: '✓ Delivered' },
  ACTIVATED:          { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e', label: '✓ Active' },
  FAILED:             { bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.25)', text: '#ff2d78', label: '✗ Failed' },
  REFUNDED:           { bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.25)', text: '#ff2d78', label: '↩ Refunded' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', text: '#c8b0e8', label: status }
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.5px]"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {s.label}
    </span>
  )
}

/* ─── Tab nav ───────────────────────────────────────────────────────────── */

function TabNav({ active, onChange, ordersCount, esimsCount }: {
  active: Tab
  onChange: (t: Tab) => void
  ordersCount: number
  esimsCount: number
}) {
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'orders', label: 'My Orders', count: ordersCount },
    { id: 'esims', label: 'My eSIMs', count: esimsCount },
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
  ]
  return (
    <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-5 py-3.5 text-[14px] font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2',
            active === tab.id ? 'text-primary' : 'text-muted hover:text-secondary',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                active === tab.id ? 'bg-[rgba(147,51,234,0.2)] text-accent-purple' : 'bg-card text-muted',
              )}
            >
              {tab.count}
            </span>
          )}
          {active === tab.id && <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-btn" />}
        </button>
      ))}
    </div>
  )
}

/* ─── Tab: Orders (empty-state foundation until Phase 4F) ───────────────── */

function OrdersTab({ orders }: { orders: AccountOrderDto[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[14px] p-16 text-center">
        <p className="text-[40px] mb-3">📦</p>
        <p className="text-[16px] font-semibold mb-2">No orders yet</p>
        <p className="text-[13px] text-muted mb-6">
          Start exploring eSIM plans for your next destination
        </p>
        <Link
          href="/browse"
          className="inline-block px-6 py-3 rounded-[10px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300"
        >
          Browse Plans →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/dashboard/orders/${order.id}`}
          className="bg-card border border-border rounded-[14px] p-5 transition-all duration-300 hover:border-border-hover hover:bg-card-hover group relative overflow-hidden block"
        >
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold truncate">{order.itemSummary}</h3>
              <p className="text-[11px] text-muted mt-1 font-mono">{order.orderNumber}</p>
              <p className="text-[11px] text-muted mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex md:flex-col md:items-end gap-3 justify-between">
              <div className="text-left md:text-right flex flex-col md:items-end gap-1.5">
                <PriceDisplay usd={order.usdTotal} size="sm" className="md:items-end" />
                <StatusBadge status={order.status} />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ─── Tab: eSIMs (empty-state foundation until Phase 4H) ────────────────── */

function ESIMsTab({ esims }: { esims: AccountEsimDto[] }) {
  if (esims.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[14px] p-16 text-center">
        <p className="text-[40px] mb-3">📶</p>
        <p className="text-[16px] font-semibold mb-2">No eSIMs yet</p>
        <p className="text-[13px] text-muted mb-6">
          Your purchased eSIMs will appear here with QR codes ready to scan.
        </p>
        <Link
          href="/browse"
          className="inline-block px-6 py-3 rounded-[10px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all duration-300"
        >
          Browse Plans →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {esims.map((e) => {
        const used = e.dataTotalMb ? Math.min((e.dataUsedMb / e.dataTotalMb) * 100, 100) : 0
        return (
          <div key={e.id} className="bg-card border border-border rounded-[14px] p-5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold truncate">{e.plan?.country ?? e.plan?.name ?? 'eSIM'}</h3>
                <p className="text-[11px] text-muted mt-0.5">{e.plan?.network ?? '—'}</p>
              </div>
              <StatusBadge status={e.status} />
            </div>
            {e.dataTotalMb && (
              <div className="mb-3">
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-muted">Data used</span>
                  <span className="text-secondary font-semibold">{(e.dataUsedMb / 1024).toFixed(2)} GB / {(e.dataTotalMb / 1024).toFixed(2)} GB</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-border">
                  <div className="h-full rounded-full" style={{ width: `${used}%`, background: 'var(--gradient-btn)' }} />
                </div>
              </div>
            )}
            {e.iccid && <p className="text-[11px] text-muted font-mono mt-2">ICCID {e.iccid}</p>}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Tab: Profile ──────────────────────────────────────────────────────── */

function ProfileTab({ profile, onSaved }: { profile: ProfileDto; onSaved: (p: ProfileDto) => void }) {
  const [name, setName] = useState(profile.name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [countryCode, setCountryCode] = useState(profile.countryCode ?? '')
  const [timezone, setTimezone] = useState(profile.timezone ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updateProfile({
        name: name.trim() || null,
        phone: phone.trim() || null,
        countryCode: countryCode.trim() ? countryCode.trim().toUpperCase() : null,
        timezone: timezone.trim() || null,
      })
      onSaved(updated)
      toast.success('Profile saved', 'Your personal details have been updated')
    } catch (err) {
      toast.error('Save failed', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <div className="bg-card border border-border rounded-[14px] p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5">Personal Info</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Full name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Email address</label>
            <input type="email" value={profile.email} disabled className={cn(INPUT_CLASS, 'opacity-60 cursor-not-allowed')} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Phone number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT_CLASS} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Country (ISO 3166-1 alpha-2)</label>
            <input
              type="text"
              maxLength={2}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="IN"
              className={cn(INPUT_CLASS, 'uppercase tracking-widest font-mono')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Timezone (IANA)</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Kolkata"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-[14px] p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5">Account Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">Member since</p>
            <p className="text-[14px] font-semibold">{memberSinceLabel(profile.memberSince)}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">Role</p>
            <p className="text-[14px] font-semibold">{profile.role}</p>
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 rounded-[14px] bg-gradient-btn text-white text-[14px] font-bold transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,45,120,0.25)] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/* ─── Tab: Settings ─────────────────────────────────────────────────────── */

function SettingsTab({ preferences, onPrefsSaved }: { preferences: PreferencesDto; onPrefsSaved: (p: PreferencesDto) => void }) {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [prefs, setPrefs] = useState(preferences)
  const [saving, setSaving] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)

  useEffect(() => { setPrefs(preferences) }, [preferences])

  async function handleSavePrefs(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await updatePreferences(prefs)
      onPrefsSaved(updated)
      toast.success('Preferences saved')
    } catch (err) {
      toast.error('Save failed', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      toast.error('Passwords do not match', 'Re-enter your new password')
      return
    }
    setChangingPwd(true)
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd })
      toast.success('Password changed')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      toast.error('Password change failed', (err as Error).message)
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-[14px] p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5">Change Password</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-secondary mb-1.5">Current password</label>
            <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="Enter current password" className={INPUT_CLASS} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-secondary mb-1.5">New password</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Min. 8 characters" className={INPUT_CLASS} required minLength={8} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-secondary mb-1.5">Confirm new password</label>
              <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Repeat new password" className={INPUT_CLASS} required />
            </div>
          </div>
          <div>
            <button type="submit" disabled={changingPwd}
              className="px-6 py-3 rounded-[12px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
              {changingPwd ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </div>
      </form>

      {/* Notifications */}
      <form onSubmit={handleSavePrefs} className="bg-card border border-border rounded-[14px] p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-5">Notifications</p>
        <div className="flex flex-col divide-y divide-border">
          <PrefRow label="Email notifications" desc="Plan updates and important account emails"
            value={prefs.emailNotifications} onChange={(v) => setPrefs((p) => ({ ...p, emailNotifications: v }))} />
          <PrefRow label="Order updates" desc="Status changes for your orders and refunds"
            value={prefs.orderUpdates} onChange={(v) => setPrefs((p) => ({ ...p, orderUpdates: v }))} />
          <PrefRow label="Expiry reminders" desc="Email alerts before your eSIM data or validity expires"
            value={prefs.expiryReminders} onChange={(v) => setPrefs((p) => ({ ...p, expiryReminders: v }))} />
          <PrefRow label="Marketing emails" desc="Promotions, discounts, and travel inspiration"
            value={prefs.marketingEmail} onChange={(v) => setPrefs((p) => ({ ...p, marketingEmail: v }))} />
          <PrefRow label="SMS notifications" desc="Text messages for critical account events"
            value={prefs.smsNotifications} onChange={(v) => setPrefs((p) => ({ ...p, smsNotifications: v }))} />
        </div>
        <div className="pt-5">
          <button type="submit" disabled={saving}
            className="px-6 py-3 rounded-[12px] bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>

      <div className="border-t border-border pt-6 mt-2">
        <button
          type="button"
          onClick={() => toast.info('Account deletion requested', 'Our team will email you to confirm')}
          className="text-[12px] text-accent-pink hover:underline transition-all"
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}

function PrefRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 pr-4">
        <h4 className="text-[14px] font-semibold mb-0.5">{label}</h4>
        <p className="text-[12px] text-muted">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors duration-300 flex-shrink-0',
          value ? 'bg-accent-purple' : 'bg-border',
        )}
        aria-label={`Toggle ${label}`}
      >
        <span className={cn('absolute top-1 w-5 h-5 rounded-full bg-white transition-transform duration-300', value ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}

/* ─── Sidebar stats ─────────────────────────────────────────────────────── */

function SidebarStats({ summary }: { summary: DashboardSummaryDto | null }) {
  const stats = [
    { label: 'Total orders', value: summary?.stats.totalOrders ?? 0, icon: '📦' },
    { label: 'Active eSIMs', value: summary?.stats.activeEsims ?? 0, icon: '📶' },
    {
      label: 'Data used',
      value: summary ? `${(summary.stats.totalDataUsedMb / 1024).toFixed(1)} GB` : '0 GB',
      icon: '📊',
    },
    {
      label: 'Member since',
      value: summary ? memberSinceLabel(summary.user.memberSince) : '—',
      icon: '⭐',
    },
  ]
  return (
    <div className="bg-card border border-border rounded-[14px] p-5 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">Account Stats</p>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/[0.02] border border-border">
            <span className="text-[20px]">{stat.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] text-muted uppercase tracking-[1px]">{stat.label}</p>
              <p className="text-[16px] font-extrabold text-primary truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/browse" className="block mt-4 py-2.5 rounded-lg text-center bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 transition-opacity">
        Browse New Plans →
      </Link>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'orders'
  function setTab(next: Tab) {
    router.replace(next === 'orders' ? '/dashboard' : `/dashboard?tab=${next}`, { scroll: false })
  }

  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null)
  const [profile, setProfile] = useState<ProfileDto | null>(null)
  const [preferences, setPreferences] = useState<PreferencesDto | null>(null)
  const [orders, setOrders] = useState<AccountOrderDto[]>([])
  const [esims, setEsims] = useState<AccountEsimDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Sequential — the Supabase pooler is bursty-sensitive, and the perceived
      // latency of five sequential JSON fetches is small.
      const s = await fetchDashboard()
      const p = await fetchProfile()
      const pr = await fetchPreferences()
      const o = await fetchMyOrders()
      const e = await fetchMyEsims()
      setSummary(s); setProfile(p); setPreferences(pr); setOrders(o); setEsims(e)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const firstName = profile?.name?.split(' ')[0] ?? profile?.email.split('@')[0] ?? 'there'

  return (
    <AuthGuard>
      {/* Hero */}
      <section className="relative pt-28 pb-10 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(147,51,234,0.25) 0%, transparent 60%)',
            animation: 'pulse 6s ease-in-out infinite',
          }}
        />
        <div className="absolute bottom-0 inset-x-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, #0a0018, transparent)' }} />
        <div className="relative z-10 max-w-[1100px] mx-auto px-6">
          <p className="animate delay-1 font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-3">Dashboard</p>
          <h1 className="animate delay-2 text-[32px] md:text-[40px] font-extrabold tracking-[-1px] mb-2"
            style={{
              background: 'linear-gradient(180deg, #fff 0%, #c8b0e8 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            My Dashboard
          </h1>
          <p className="animate delay-3 text-[15px] text-secondary">
            Welcome back, <strong className="text-primary">{firstName}</strong> 👋
          </p>
        </div>
      </section>

      {/* Main */}
      <div className="max-w-[1100px] mx-auto px-6 pb-20 pt-10">
        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-accent-pink text-[14px] mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 rounded-lg border border-border text-secondary text-[13px] hover:text-primary">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="order-2 lg:order-1 min-w-0">
              <TabNav active={tab} onChange={setTab} ordersCount={orders.length} esimsCount={esims.length} />
              <div key={tab} style={{ animation: 'fadeUp 0.4s ease both' }}>
                {tab === 'orders' && <OrdersTab orders={orders} />}
                {tab === 'esims' && <ESIMsTab esims={esims} />}
                {tab === 'profile' && profile && <ProfileTab profile={profile} onSaved={setProfile} />}
                {tab === 'settings' && preferences && <SettingsTab preferences={preferences} onPrefsSaved={setPreferences} />}
              </div>
            </div>
            <aside className="order-1 lg:order-2">
              <div className="lg:sticky lg:top-20">
                <SidebarStats summary={summary} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
