'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, Globe, Plus, Search, SlidersHorizontal, Tag, Trash2, TrendingUp } from 'lucide-react'
import {
  pricingStats,
  type CountryProfitRule,
  type DurationProfitRule,
  type PlanOverrideRule,
  type PricingRuleSet,
} from '@/lib/pricing'
import {
  deleteCountryRule as apiDeleteCountryRule,
  deleteDurationRule as apiDeleteDurationRule,
  deletePlanOverride as apiDeletePlanOverride,
  createDurationRule as apiCreateDurationRule,
  fetchAuditLog,
  fetchRuleSet,
  saveGlobalRule,
  updateCountryRule as apiUpdateCountryRule,
  updateDurationRule as apiUpdateDurationRule,
  upsertCountryRule,
  upsertPlanOverride,
  type PricingAuditEntry,
  type PricingRuleSetDto,
} from '@/lib/pricing-admin-client'
import { fetchCountries, fetchPlans, type CountryListItem, type PlanListItem } from '@/lib/plan-client'
import RevenueCard from '@/components/admin/RevenueCard'
import PricingRuleTable, { type RuleColumn } from '@/components/admin/PricingRuleTable'
import PricingPreviewCard from '@/components/admin/PricingPreviewCard'
import Modal from '@/components/admin/Modal'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toast'

const INPUT =
  'w-full bg-card border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover'
const FIELD_LABEL = 'text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-1.5 block'

/* ─── DTO → UI adapters (so PricingPreviewCard + tables stay unchanged) ──── */

function toRuleSet(dto: PricingRuleSetDto): PricingRuleSet {
  return {
    global: { profit: dto.global.profitUsd },
    countries: dto.countries.map((c) => ({
      id: c.id,
      country: c.country.name,
      profit: c.profitUsd,
    })),
    durations: dto.durations.map((d) => ({
      id: d.id,
      label: d.label,
      minDays: d.minDays,
      maxDays: d.maxDays,
      profit: d.profitUsd,
    })),
    overrides: dto.overrides.map((o) => ({
      id: o.id,
      esimId: o.plan.esimId,
      planName: o.plan.name,
      sellPrice: o.fixedPriceUsd,
    })),
  }
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function AdminPricingPage() {
  const [dto, setDto] = useState<PricingRuleSetDto | null>(null)
  const [countries, setCountries] = useState<CountryListItem[]>([])
  const [audit, setAudit] = useState<PricingAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial load + helper to refresh after any mutation
  const reload = useCallback(async () => {
    try {
      const [rs, cs, al] = await Promise.all([
        fetchRuleSet(),
        fetchCountries(),
        fetchAuditLog(25),
      ])
      setDto(rs.ruleSet)
      setCountries(cs)
      setAudit(al.entries)
      setError(null)
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load pricing rules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const rules = useMemo(() => (dto ? toRuleSet(dto) : null), [dto])
  const stats = useMemo(() => (rules ? pricingStats(rules) : null), [rules])

  // Country.id lookup, used by country mutations + override modal context.
  const countryByName = useMemo(() => {
    const m = new Map<string, CountryListItem>()
    for (const c of countries) m.set(c.name, c)
    return m
  }, [countries])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
      </div>
    )
  }
  if (error || !rules || !stats || !dto) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-accent-pink text-[14px] mb-3">{error ?? 'Pricing data unavailable'}</p>
          <button onClick={reload} className="px-4 py-2 rounded-lg border border-border text-secondary text-[13px] hover:text-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-accent-pink mb-2">
          Revenue
        </p>
        <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Pricing Center</h1>
        <p className="text-[13px] text-muted mt-1">
          Manage fixed-dollar profit across thousands of tSIM plans — no per-plan editing.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RevenueCard label="Active Pricing Rules" value={stats.activeRules} icon={SlidersHorizontal} />
        <RevenueCard label="Plans With Overrides" value={stats.plansWithOverrides} icon={Tag} />
        <RevenueCard
          label="Average Profit"
          value={`+$${stats.averageProfit.toFixed(2)}`}
          accent="text-accent-green"
          icon={TrendingUp}
        />
        <RevenueCard
          label="Highest Profit Rule"
          value={`+$${stats.highest.profit}`}
          sub={stats.highest.label}
          icon={Banknote}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <GlobalProfitRuleCard
            profit={rules.global.profit}
            onSave={async (profit) => {
              try {
                await saveGlobalRule({ profitUsd: profit, isActive: true })
                toast.success('Global profit updated', `Now +$${profit} on every plan by default`)
                await reload()
              } catch (e) { toast.error('Save failed', (e as Error).message) }
            }}
          />

          <CountryRules
            rules={rules}
            countries={countries}
            countryByName={countryByName}
            onUpsert={async (rule) => {
              const country = countryByName.get(rule.country)
              if (!country) { toast.error('Unknown country', rule.country); return }
              try {
                // PUT when the rule already exists (preserves id), POST otherwise.
                if (rule.id && rules.countries.some((c) => c.id === rule.id)) {
                  await apiUpdateCountryRule(rule.id, { profitUsd: rule.profit, isActive: true })
                } else {
                  await upsertCountryRule({ countryId: country.id, profitUsd: rule.profit, isActive: true })
                }
                toast.success('Country rule saved', `${rule.country} +$${rule.profit}`)
                await reload()
              } catch (e) { toast.error('Save failed', (e as Error).message) }
            }}
            onDelete={async (rule) => {
              try {
                await apiDeleteCountryRule(rule.id)
                toast.info('Country rule deleted')
                await reload()
              } catch (e) { toast.error('Delete failed', (e as Error).message) }
            }}
          />

          <DurationRules
            rules={rules}
            onCreate={async (rule) => {
              try {
                await apiCreateDurationRule({
                  label: rule.label, minDays: rule.minDays, maxDays: rule.maxDays,
                  profitUsd: rule.profit, isActive: true,
                })
                toast.success('Duration rule added')
                await reload()
              } catch (e) { toast.error('Save failed', (e as Error).message) }
            }}
            onUpdate={async (id, rule) => {
              try {
                await apiUpdateDurationRule(id, {
                  label: rule.label, minDays: rule.minDays, maxDays: rule.maxDays,
                  profitUsd: rule.profit, isActive: true,
                })
                toast.success('Duration rule updated')
                await reload()
              } catch (e) { toast.error('Save failed', (e as Error).message) }
            }}
            onDelete={async (rule) => {
              try {
                await apiDeleteDurationRule(rule.id)
                toast.info('Duration rule deleted')
                await reload()
              } catch (e) { toast.error('Delete failed', (e as Error).message) }
            }}
          />

          <PlanOverrides
            rules={rules}
            overridesDto={dto.overrides}
            onUpsert={async (planId, sellPrice) => {
              try {
                await upsertPlanOverride({ planId, fixedPriceUsd: sellPrice, isActive: true })
                toast.success('Override saved', `→ $${sellPrice.toFixed(2)}`)
                await reload()
              } catch (e) { toast.error('Save failed', (e as Error).message) }
            }}
            onDelete={async (rule) => {
              try {
                await apiDeletePlanOverride(rule.id)
                toast.info('Override removed')
                await reload()
              } catch (e) { toast.error('Delete failed', (e as Error).message) }
            }}
          />

          <AuditLogPanel entries={audit} onRefresh={reload} />
        </div>

        <PricingPreviewCard
          rules={rules}
          countries={countries.map((c) => ({ name: c.name, flag: c.flag ?? undefined }))}
        />
      </div>
    </div>
  )
}

/* ─── Global profit ──────────────────────────────────────────────────────── */

function GlobalProfitRuleCard({ profit, onSave }: { profit: number; onSave: (p: number) => void | Promise<void> }) {
  const [draft, setDraft] = useState(String(profit))
  const parsed = parseFloat(draft)
  const dirty = !Number.isNaN(parsed) && parsed !== profit

  useEffect(() => { setDraft(String(profit)) }, [profit])

  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />
      <div className="flex items-center gap-2 mb-1">
        <Globe size={15} className="text-accent-purple" />
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">
          Global Profit Rule
        </p>
      </div>
      <p className="text-[12px] text-muted mb-4">
        Applied to every plan by default, unless a more specific rule matches.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[20px] font-extrabold text-muted">+$</span>
          <input
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-28 bg-mid border border-border rounded-lg px-3 py-2.5 text-[18px] font-extrabold text-primary focus:outline-none focus:border-border-hover"
          />
        </div>
        <button
          onClick={() => !Number.isNaN(parsed) && onSave(parsed)}
          disabled={!dirty}
          className="px-5 py-2.5 rounded-lg bg-gradient-btn text-white text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

/* ─── Country rules ──────────────────────────────────────────────────────── */

function CountryRules({
  rules,
  countries,
  countryByName,
  onUpsert,
  onDelete,
}: {
  rules: PricingRuleSet
  countries: CountryListItem[]
  countryByName: Map<string, CountryListItem>
  onUpsert: (rule: CountryProfitRule) => void
  onDelete: (rule: CountryProfitRule) => void
}) {
  const [editing, setEditing] = useState<CountryProfitRule | null>(null)
  const [creating, setCreating] = useState(false)

  const columns: RuleColumn<CountryProfitRule>[] = [
    {
      header: 'Country',
      render: (r) => {
        const flag = countryByName.get(r.country)?.flag ?? '🌍'
        return (
          <span className="inline-flex items-center gap-2 font-semibold text-primary">
            <span className="text-[18px] leading-none">{flag}</span>
            {r.country}
          </span>
        )
      },
    },
    {
      header: 'Profit',
      align: 'right',
      render: (r) => <span className="font-bold text-accent-green font-mono">+${r.profit}</span>,
    },
  ]

  return (
    <>
      <PricingRuleTable
        title="Country Profit Rules"
        subtitle="Fixed profit for all plans in a country."
        columns={columns}
        rows={rules.countries}
        rowKey={(r) => r.id}
        onAdd={() => setCreating(true)}
        onEdit={(r) => setEditing(r)}
        onDelete={onDelete}
      />

      <CountryRuleModal
        key={editing ? editing.id : creating ? '__new__' : '__closed__'}
        open={!!editing || creating}
        rule={editing}
        countries={countries}
        onClose={() => { setEditing(null); setCreating(false) }}
        onSave={(rule) => {
          onUpsert(rule)
          setEditing(null); setCreating(false)
        }}
      />
    </>
  )
}

function CountryRuleModal({
  open,
  rule,
  countries,
  onClose,
  onSave,
}: {
  open: boolean
  rule: CountryProfitRule | null
  countries: CountryListItem[]
  onClose: () => void
  onSave: (rule: CountryProfitRule) => void
}) {
  const [country, setCountry] = useState(rule?.country ?? countries[0]?.name ?? '')
  const [profit, setProfit] = useState(String(rule?.profit ?? 3))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ id: rule?.id ?? '', country, profit: parseFloat(profit) || 0 })
  }

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit country rule' : 'Add country rule'} width="440px">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={FIELD_LABEL}>Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={INPUT}
            disabled={!!rule}
            required
          >
            {countries.map((c) => (
              <option key={c.code} value={c.name}>{c.flag ?? '🌍'} {c.name}</option>
            ))}
          </select>
          {rule && (
            <p className="text-[10px] text-muted mt-1">Country can&apos;t change after creation. Delete and add a new rule instead.</p>
          )}
        </div>
        <div>
          <label className={FIELD_LABEL}>Profit (USD)</label>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-muted">+$</span>
            <input
              inputMode="decimal"
              value={profit}
              onChange={(e) => setProfit(e.target.value)}
              className={INPUT}
              required
            />
          </div>
        </div>
        <ModalButtons editing={!!rule} onClose={onClose} />
      </form>
    </Modal>
  )
}

/* ─── Duration rules ─────────────────────────────────────────────────────── */

function DurationRules({
  rules,
  onCreate,
  onUpdate,
  onDelete,
}: {
  rules: PricingRuleSet
  onCreate: (rule: DurationProfitRule) => void
  onUpdate: (id: string, rule: DurationProfitRule) => void
  onDelete: (rule: DurationProfitRule) => void
}) {
  const [editing, setEditing] = useState<DurationProfitRule | null>(null)
  const [creating, setCreating] = useState(false)

  const columns: RuleColumn<DurationProfitRule>[] = [
    { header: 'Days Range', render: (r) => <span className="font-semibold text-primary">{r.label}</span> },
    {
      header: 'Profit',
      align: 'right',
      render: (r) => <span className="font-bold text-accent-green font-mono">+${r.profit}</span>,
    },
  ]

  return (
    <>
      <PricingRuleTable
        title="Duration Profit Rules"
        subtitle="Fixed profit by validity range."
        columns={columns}
        rows={rules.durations}
        rowKey={(r) => r.id}
        onAdd={() => setCreating(true)}
        onEdit={(r) => setEditing(r)}
        onDelete={onDelete}
      />

      <DurationRuleModal
        key={editing ? editing.id : creating ? '__new__' : '__closed__'}
        open={!!editing || creating}
        rule={editing}
        onClose={() => { setEditing(null); setCreating(false) }}
        onSave={(rule) => {
          if (editing) onUpdate(editing.id, rule)
          else onCreate(rule)
          setEditing(null); setCreating(false)
        }}
      />
    </>
  )
}

function DurationRuleModal({
  open,
  rule,
  onClose,
  onSave,
}: {
  open: boolean
  rule: DurationProfitRule | null
  onClose: () => void
  onSave: (rule: DurationProfitRule) => void
}) {
  const [label, setLabel] = useState(rule?.label ?? '')
  const [minDays, setMinDays] = useState(String(rule?.minDays ?? 1))
  const [openEnded, setOpenEnded] = useState(rule ? rule.maxDays === null : false)
  const [maxDays, setMaxDays] = useState(String(rule?.maxDays ?? 7))
  const [profit, setProfit] = useState(String(rule?.profit ?? 2))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      id: rule?.id ?? '',
      label: label.trim(),
      minDays: parseInt(minDays) || 0,
      maxDays: openEnded ? null : parseInt(maxDays) || 0,
      profit: parseFloat(profit) || 0,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={rule ? 'Edit duration rule' : 'Add duration rule'} width="460px">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={FIELD_LABEL}>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 16–29 Days" className={INPUT} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={FIELD_LABEL}>Min days</label>
            <input inputMode="numeric" value={minDays} onChange={(e) => setMinDays(e.target.value)} className={INPUT} required />
          </div>
          <div>
            <label className={FIELD_LABEL}>Max days</label>
            <input
              inputMode="numeric"
              value={openEnded ? '' : maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              disabled={openEnded}
              placeholder={openEnded ? 'Open-ended' : ''}
              className={cn(INPUT, openEnded && 'opacity-50')}
            />
          </div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={openEnded} onChange={(e) => setOpenEnded(e.target.checked)} className="w-4 h-4 accent-accent-purple" />
          <span className="text-[13px] text-secondary">Open-ended (e.g. 30+ days)</span>
        </label>
        <div>
          <label className={FIELD_LABEL}>Profit (USD)</label>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-muted">+$</span>
            <input inputMode="decimal" value={profit} onChange={(e) => setProfit(e.target.value)} className={INPUT} required />
          </div>
        </div>
        <ModalButtons editing={!!rule} onClose={onClose} />
      </form>
    </Modal>
  )
}

/* ─── Plan overrides ─────────────────────────────────────────────────────── */

function PlanOverrides({
  rules,
  overridesDto,
  onUpsert,
  onDelete,
}: {
  rules: PricingRuleSet
  overridesDto: PricingRuleSetDto['overrides']
  onUpsert: (planId: string, sellPrice: number) => void
  onDelete: (rule: PlanOverrideRule) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlanListItem[]>([])
  const [selected, setSelected] = useState<{ planId: string; esimId: string; name: string } | null>(null)
  const [sellPrice, setSellPrice] = useState('')

  // Debounced server-side plan search.
  useEffect(() => {
    const q = query.trim()
    if (!q || selected) { setResults([]); return }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetchPlans({ filters: { q }, perPage: 6, sort: 'popular' }, ctrl.signal)
        .then((r) => setResults(r.items))
        .catch(() => { /* aborted or transient */ })
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, selected])

  function add() {
    if (!selected || !sellPrice) return
    const price = parseFloat(sellPrice)
    if (Number.isNaN(price)) return
    onUpsert(selected.planId, price)
    setSelected(null); setSellPrice(''); setQuery(''); setResults([])
  }

  // Resolve planId for delete (we only have the rule's own id + esimId from the UI shape).
  const planIdByOverrideId = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of overridesDto) m.set(o.id, o.plan.id)
    return m
  }, [overridesDto])

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[15px] font-bold">Plan Override Rules</h3>
        <p className="text-[12px] text-muted mt-0.5">
          Set a fixed selling price for a specific plan — overrides all other rules.
        </p>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
            placeholder="Search by eSIM ID or plan name"
            className="w-full pl-9 pr-3 py-2.5 bg-mid border border-border rounded-lg text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover"
          />
        </div>

        {/* Results */}
        {query && !selected && (
          <div className="flex flex-col gap-1.5">
            {results.length === 0 ? (
              <p className="text-[12px] text-muted px-1 py-2">No plans match “{query}”.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelected({ planId: p.id, esimId: p.esimId, name: p.name }); setSellPrice(p.costUsd.toFixed(2)) }}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-mid hover:bg-card-hover hover:border-border-hover transition-all text-left"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    {p.flag && <span className="text-[16px] leading-none">{p.flag}</span>}
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold truncate">{p.name}</span>
                      <span className="block text-[11px] text-muted font-mono truncate">{p.esimId}</span>
                    </span>
                  </span>
                  <span className="text-[12px] text-muted font-mono flex-shrink-0">${p.costUsd.toFixed(2)}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected → set price */}
        {selected && (
          <div className="flex flex-col gap-3 p-3 rounded-lg border border-accent-purple/30 bg-accent-purple/[0.06]">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold truncate">{selected.name}</span>
                <span className="block text-[11px] text-muted font-mono truncate">{selected.esimId}</span>
              </span>
              <button onClick={() => setSelected(null)} className="text-[11px] text-muted hover:text-primary">Change</button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={FIELD_LABEL}>Fixed sell price (USD)</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px] font-bold text-muted">$</span>
                  <input
                    inputMode="decimal"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>
              <button
                onClick={add}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
              >
                <Plus size={13} /> Save
              </button>
            </div>
          </div>
        )}

        {/* Existing overrides */}
        <div className="flex flex-col gap-1.5">
          {rules.overrides.length === 0 ? (
            <p className="text-[12px] text-muted px-1">No plan overrides yet.</p>
          ) : (
            rules.overrides.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-mid"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{o.planName}</span>
                  <span className="block text-[11px] text-muted font-mono truncate">{o.esimId}</span>
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[14px] font-extrabold text-gradient">${o.sellPrice.toFixed(2)}</span>
                  <button
                    onClick={() => onDelete(o)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:bg-card-hover hover:text-accent-pink transition-all"
                    title="Remove override"
                  >
                    <Trash2 size={13} />
                  </button>
                  {/* planId is implicit via the rule id; the lookup map above keeps DTO referenced. */}
                  <span className="hidden">{planIdByOverrideId.get(o.id) ?? ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Audit log panel ────────────────────────────────────────────────────── */

function AuditLogPanel({ entries, onRefresh }: { entries: PricingAuditEntry[]; onRefresh: () => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold">Pricing Audit Log</h3>
          <p className="text-[12px] text-muted mt-0.5">Most recent {entries.length} pricing-rule changes.</p>
        </div>
        <button onClick={onRefresh} className="text-[12px] text-muted hover:text-primary">Refresh</button>
      </div>
      {entries.length === 0 ? (
        <p className="px-5 py-6 text-[12px] text-muted">No pricing changes recorded yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((e) => (
            <div key={e.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-primary truncate">
                  {e.action} · {labelForEntity(e.entity)}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {e.actor?.name ?? e.actor?.email ?? 'System'} · {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
              <code className="text-[10px] text-muted font-mono truncate max-w-[40%]" title={JSON.stringify(e.after)}>
                {summariseAfter(e.after)}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function labelForEntity(entity: string): string {
  switch (entity) {
    case 'PricingGlobalRule': return 'Global rule'
    case 'PricingCountryRule': return 'Country rule'
    case 'PricingDurationRule': return 'Duration rule'
    case 'PlanPriceOverride': return 'Plan override'
    default: return entity
  }
}
function summariseAfter(after: unknown): string {
  if (after === null || after === undefined) return '—'
  if (typeof after !== 'object') return String(after)
  const obj = after as Record<string, unknown>
  if ('profitUsd' in obj) return `+$${Number(obj.profitUsd).toFixed(2)}`
  if ('fixedPriceUsd' in obj) return `$${Number(obj.fixedPriceUsd).toFixed(2)}`
  return JSON.stringify(obj).slice(0, 60)
}

/* ─── Shared modal buttons ───────────────────────────────────────────────── */

function ModalButtons({ editing, onClose }: { editing: boolean; onClose: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-2.5 rounded-lg border border-border text-secondary text-[12px] font-bold hover:bg-card-hover hover:text-primary transition-all"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-btn text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
      >
        {editing ? 'Save changes' : 'Add rule'}
      </button>
    </div>
  )
}
