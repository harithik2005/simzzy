'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Lock, RefreshCw } from 'lucide-react'
import { fetchAdminSettings, updateAdminSettings, type SettingDto } from '@/lib/admin-client'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

const GROUP_LABELS: Record<string, string> = {
  general: 'General',
  features: 'Features',
  integration: 'Integrations',
}

// Seeded, supported display currencies (server validates against active currencies).
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'JPY', 'THB', 'MYR', 'IDR', 'KRW', 'CAD', 'NZD', 'PHP']

type Value = string | number | boolean

export default function AdminSettingsPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  const [settings, setSettings] = useState<SettingDto[]>([])
  const [values, setValues] = useState<Record<string, Value>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminSettings()
      setSettings(data)
      setValues(Object.fromEntries(data.map((s) => [s.key, s.value])))
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const groups = useMemo(() => {
    const map = new Map<string, SettingDto[]>()
    for (const s of settings) {
      const arr = map.get(s.group) ?? []
      arr.push(s)
      map.set(s.group, arr)
    }
    return [...map.entries()]
  }, [settings])

  const dirty = useMemo(
    () => settings.some((s) => values[s.key] !== s.value),
    [settings, values],
  )

  function set(key: string, value: Value) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const updates: Record<string, Value> = {}
    for (const s of settings) {
      if (values[s.key] !== s.value) {
        // Don't submit gated fields the current admin can't change.
        if (s.superAdminOnly && !isSuperAdmin) continue
        updates[s.key] = values[s.key]
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.info('Nothing to save')
      return
    }
    setSaving(true)
    try {
      const next = await updateAdminSettings(updates)
      setSettings(next)
      setValues(Object.fromEntries(next.map((s) => [s.key, s.value])))
      toast.success('Settings saved')
    } catch (e) {
      toast.error('Save failed', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
            Configuration
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Settings</h1>
          <p className="text-[13px] text-muted mt-1">
            {isSuperAdmin ? 'You can change every setting, including production toggles.' : 'Production toggles are restricted to SUPER_ADMIN.'}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-secondary text-[12px] hover:text-primary"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="border border-accent-pink/40 bg-accent-pink/[0.06] text-accent-pink rounded-2xl p-4">
          {error} — <button onClick={load} className="underline">retry</button>
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-5">
        {groups.map(([group, items]) => (
          <Section key={group} title={GROUP_LABELS[group] ?? group}>
            <div className="flex flex-col gap-4">
              {items.map((s) => {
                const locked = s.superAdminOnly && !isSuperAdmin
                return (
                  <SettingRow key={s.key} setting={s} locked={locked}>
                    {renderControl(s, values[s.key], locked, (v) => set(s.key, v))}
                  </SettingRow>
                )
              })}
            </div>
          </Section>
        ))}

        {settings.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="px-6 py-2.5 rounded-lg bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {dirty && !saving && <span className="text-[12px] text-muted">You have unsaved changes.</span>}
          </div>
        )}
      </form>
    </div>
  )
}

function renderControl(s: SettingDto, value: Value, locked: boolean, onChange: (v: Value) => void) {
  if (s.type === 'BOOLEAN') {
    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange(!(value as boolean))}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed',
          value ? 'bg-accent-purple' : 'bg-border',
        )}
        aria-label={`Toggle ${s.label}`}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform', value ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    )
  }
  if (s.key === 'default_currency') {
    return (
      <select
        value={value as string}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        className="bg-mid border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary focus:outline-none focus:border-border-hover disabled:opacity-50 min-w-[140px]"
      >
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    )
  }
  return (
    <input
      type={s.key === 'support_email' ? 'email' : 'text'}
      value={value as string}
      disabled={locked}
      onChange={(e) => onChange(e.target.value)}
      className="bg-mid border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary focus:outline-none focus:border-border-hover disabled:opacity-50 min-w-[220px]"
    />
  )
}

function SettingRow({ setting, locked, children }: { setting: SettingDto; locked: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-card border border-border rounded-lg">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold">{setting.label}</p>
          {setting.superAdminOnly && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-accent-pink">
              <Lock size={10} /> super admin
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted mt-0.5">
          {setting.description}{locked && ' — ask a SUPER_ADMIN to change this.'}
        </p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn opacity-60" />
      <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink mb-4">{title}</p>
      {children}
    </div>
  )
}
