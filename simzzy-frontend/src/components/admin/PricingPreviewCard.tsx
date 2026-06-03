'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import StatusPill from '@/components/admin/StatusPill'
import { computePrice, type AppliedRuleType, type PricingRuleSet } from '@/lib/pricing'

type PricingPreviewCardProps = {
  rules: PricingRuleSet
  countries: { name: string; flag?: string }[]
}

const RULE_PILL: Record<AppliedRuleType, 'green' | 'yellow' | 'purple' | 'gray'> = {
  override: 'purple',
  country: 'green',
  duration: 'yellow',
  global: 'gray',
}

const INPUT =
  'w-full bg-mid border border-border rounded-lg px-3 py-2.5 text-[13px] text-primary placeholder:text-muted focus:outline-none focus:border-border-hover'

const LABEL = 'text-[10px] font-mono uppercase tracking-widest text-muted font-bold mb-1.5 block'

/** Live pricing calculator — recomputes the selling price on every input change. */
export default function PricingPreviewCard({ rules, countries }: PricingPreviewCardProps) {
  const [cost, setCost] = useState('6.50')
  const [country, setCountry] = useState(countries[0]?.name ?? '')
  const [days, setDays] = useState('7')

  const result = computePrice(
    {
      costPrice: parseFloat(cost) || 0,
      country: country || undefined,
      days: parseInt(days) || undefined,
    },
    rules,
  )

  return (
    <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden lg:sticky lg:top-20 self-start">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-btn" />

      <div className="flex items-center gap-2 mb-5">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent-purple/12 text-accent-purple">
          <Calculator size={15} />
        </span>
        <p className="font-mono text-[11px] font-bold tracking-[2px] uppercase text-accent-pink">
          Pricing Preview
        </p>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-3 mb-5">
        <div>
          <label className={LABEL}>Cost Price (USD)</label>
          <input
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="6.50"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={INPUT}>
            {countries.map((c) => (
              <option key={c.name} value={c.name}>
                {c.flag ? `${c.flag} ` : ''}{c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Duration (days)</label>
          <input
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="7"
            className={INPUT}
          />
        </div>
      </div>

      {/* Result */}
      <div className="bg-mid border border-border rounded-xl p-4 flex flex-col gap-3">
        <Row label="Base Cost" value={`$${result.baseCost.toFixed(2)}`} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted">Applied Rule</span>
          <StatusPill color={RULE_PILL[result.appliedRuleType]}>{result.appliedRuleLabel}</StatusPill>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold">Final Selling Price</span>
          <span className="text-[22px] font-extrabold text-gradient">
            ${result.sellingPrice.toFixed(2)}
          </span>
        </div>
        <Row
          label="Expected Profit"
          value={`+$${result.profit.toFixed(2)}`}
          valueClass="text-accent-green font-bold"
        />
      </div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-muted">{label}</span>
      <span className={valueClass ?? 'text-[13px] font-semibold font-mono'}>{value}</span>
    </div>
  )
}
