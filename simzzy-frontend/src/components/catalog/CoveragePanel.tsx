'use client'

import { Wifi } from 'lucide-react'
import type { CoverageDto } from '@/lib/catalog-client'

/**
 * Expandable network-details panel (Phase 4G.5, Step 12). Shows networks per
 * country with 3G/4G/5G support + APNs, from the imported coverage data.
 */
export function CoveragePanel({ coverage, fup, apn }: { coverage: CoverageDto | null; fup?: string | null; apn?: string | null }) {
  return (
    <div className="bg-mid border border-border rounded-xl p-4 text-[12px] flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {coverage?.has3G && <Badge tone="gray">3G</Badge>}
        {coverage?.has4G && <Badge>4G</Badge>}
        {coverage?.has5G && <Badge tone="pink">5G</Badge>}
        {fup && <span className="text-muted">FUP: <span className="text-secondary">{fup}</span></span>}
        {apn && <span className="text-muted">APN: <span className="text-secondary font-mono">{apn}</span></span>}
        {coverage && <span className="text-muted ml-auto">{coverage.countryCount} {coverage.countryCount === 1 ? 'country' : 'countries'}</span>}
      </div>

      {!coverage || coverage.countries.length === 0 ? (
        <p className="text-muted">Network coverage details are not available for this bundle.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-2">
          {coverage.countries.map((c) => (
            <div key={c.iso} className="border-b border-border/60 last:border-b-0 pb-2 last:pb-0">
              <p className="font-semibold text-secondary mb-1">{c.flag ?? '🌐'} {c.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.networks.map((n, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-border text-[11px]">
                    <Wifi size={10} className="text-muted" />
                    {n.name}
                    {n.has5G ? <em className="not-italic text-accent-pink font-bold">5G</em> : n.has4G ? <em className="not-italic text-accent-green font-bold">4G</em> : n.has3G ? <em className="not-italic text-muted font-bold">3G</em> : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Badge({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'pink' | 'gray' }) {
  const cls = tone === 'pink'
    ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/25'
    : tone === 'gray'
      ? 'bg-card text-muted border-border'
      : 'bg-accent-green/10 text-accent-green border-accent-green/25'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border font-mono ${cls}`}>
      {children}
    </span>
  )
}
