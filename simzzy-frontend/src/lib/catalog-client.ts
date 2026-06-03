/**
 * Browser-side catalog client (Phase 4G.5) for the redesigned Browse + daily
 * pages. Wraps the public `/api/catalog/*` routes. Selling prices come from the
 * backend (pricing engine); the UI converts USD → local via PriceDisplay.
 */
import type {
  DestinationSummary,
  PlanCardDto,
  CoverageDto,
  CoverageMap,
  DailyPlansResult,
} from 'simzzy-backend'

export type { DestinationSummary, PlanCardDto, CoverageDto, CoverageMap, DailyPlansResult }

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: 'no-store' })
  if (!res.ok) {
    let detail: string | undefined
    try { detail = (await res.json())?.error } catch {}
    throw new Error(detail ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export function fetchDestinations(filters: { q?: string; region?: string } = {}, signal?: AbortSignal) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.region) sp.set('region', filters.region)
  const qs = sp.toString()
  return getJson<{ destinations: DestinationSummary[] }>(`/api/catalog/destinations${qs ? `?${qs}` : ''}`, signal)
    .then((r) => r.destinations)
}

export function fetchDestination(slug: string, signal?: AbortSignal) {
  return getJson<{ destination: DestinationSummary | null; regularPlans: PlanCardDto[]; coverageByBundle: CoverageMap }>(
    `/api/catalog/destinations/${encodeURIComponent(slug)}`,
    signal,
  )
}

export function fetchDailyPlans(slug: string, signal?: AbortSignal) {
  return getJson<{ daily: DailyPlansResult | null; coverageByBundle: CoverageMap }>(
    `/api/catalog/destinations/${encodeURIComponent(slug)}/daily`,
    signal,
  )
}

export function selectDailyPlan(slug: string, days: number, pkg: string, signal?: AbortSignal) {
  const sp = new URLSearchParams({ days: String(days), package: pkg })
  return getJson<{ plan: PlanCardDto | null }>(
    `/api/catalog/destinations/${encodeURIComponent(slug)}/select?${sp.toString()}`,
    signal,
  ).then((r) => r.plan)
}
