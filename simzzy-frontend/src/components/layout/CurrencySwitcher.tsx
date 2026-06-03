'use client'

import { useCurrency } from '@/context/currency'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

export function CurrencySwitcher() {
  const { code, setCurrency } = useCurrency()

  // Ensure the detected currency is always selectable even if outside the short list.
  const options = SUPPORTED_CURRENCIES.includes(code as (typeof SUPPORTED_CURRENCIES)[number])
    ? [...SUPPORTED_CURRENCIES]
    : [code, ...SUPPORTED_CURRENCIES]

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="font-mono uppercase tracking-widest">Currency</span>
      <select
        value={code}
        onChange={(e) => setCurrency(e.target.value)}
        aria-label="Display currency"
        className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-secondary focus:outline-none focus:border-border-hover cursor-pointer"
      >
        {options.map((c) => (
          <option key={c} value={c} className="bg-[#1a0040]">
            {c}
          </option>
        ))}
      </select>
    </label>
  )
}
