/**
 * Pure catalog helpers (no DB) — slugging, data-tier parsing, and dynamic daily
 * classification. Shared by the importer and the query services so the rules
 * live in exactly one place.
 *
 * Daily classification is DERIVED from the supplier "High-speed data" string
 * (`Daily 500MB` / `Daily 1GB` / `Daily 2GB` / `Daily 3GB`) — never from a
 * hardcoded country list, per requirement.
 */

/** URL-safe slug: lowercases, strips punctuation, collapses to hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-') // ( ) + , space etc. all collapse to a separator
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/** Region code from a supplier region label, e.g. "North America" → "north-america". */
export function regionCode(name: string): string {
  return slugify(name)
}

export type DataTier = '500MB' | '1GB' | '2GB' | '3GB'
export const DAILY_TIERS: DataTier[] = ['500MB', '1GB', '2GB', '3GB']

export type DataClassification = {
  /** True when the supplier marks the plan as a per-day "Daily X" allowance. */
  isDaily: boolean
  /** Megabytes of the high-speed allowance (per-day for daily plans, total otherwise). */
  mb: number | null
  /** Normalized tier label, e.g. "1GB", "50GB". */
  tier: string
  /** For daily plans, the per-day package label (one of DAILY_TIERS); else null. */
  dailyPackage: DataTier | null
}

const MB_RE = /^([\d.]+)\s*(GB|MB|TB)$/i

function toMb(value: number, unit: string): number {
  const u = unit.toUpperCase()
  if (u === 'TB') return Math.round(value * 1024 * 1024)
  if (u === 'GB') return Math.round(value * 1024)
  return Math.round(value)
}

/**
 * Classify a "High-speed data" cell. Examples:
 *   "Daily 1GB" → { isDaily:true,  mb:1024, tier:"1GB",  dailyPackage:"1GB" }
 *   "Daily 500MB" → { isDaily:true, mb:500, tier:"500MB", dailyPackage:"500MB" }
 *   "50GB"     → { isDaily:false, mb:51200, tier:"50GB", dailyPackage:null }
 */
export function classifyData(raw: string): DataClassification {
  const value = (raw ?? '').trim()
  const dailyMatch = /^daily\s+(.+)$/i.exec(value)
  if (dailyMatch) {
    const tier = dailyMatch[1].trim().replace(/\s+/g, '').toUpperCase()
    const m = MB_RE.exec(tier)
    const mb = m ? toMb(parseFloat(m[1]), m[2]) : null
    const dailyPackage = (DAILY_TIERS as string[]).includes(tier) ? (tier as DataTier) : null
    return { isDaily: true, mb, tier: tier.replace('MB', 'MB').replace('GB', 'GB'), dailyPackage }
  }
  const tier = value.replace(/\s+/g, '').toUpperCase()
  const m = MB_RE.exec(tier)
  return { isDaily: false, mb: m ? toMb(parseFloat(m[1]), m[2]) : null, tier, dailyPackage: null }
}

/** Regional-indicator flag emoji from a 2-letter ISO code, e.g. "JP" → 🇯🇵. */
export function isoToFlag(iso: string | null | undefined): string | null {
  if (!iso) return null
  const code = iso.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  const A = 0x1f1e6
  return String.fromCodePoint(A + (code.charCodeAt(0) - 65), A + (code.charCodeAt(1) - 65))
}
