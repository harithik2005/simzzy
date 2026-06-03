/**
 * Browser-side catalog API client.
 *
 * Wraps `/api/plans`, `/api/plans/[slug]`, `/api/plans/search`, `/api/countries`,
 * and `/api/regions`. Pass it the same `PlanListFilters`/`PlanListParams` shape
 * the backend service uses so call sites stay symmetric.
 *
 * Server components should import from `simzzy-backend` directly (cheaper than
 * an HTTP hop); this module is for client components and route handlers calling
 * out to the storefront API.
 */
import type {
  PlanDetailDto,
  PlanListFilters,
  PlanListItem,
  PlanListParams,
  PlanListResult,
  PlanSort,
  CountryListItem,
  RegionListItem,
} from 'simzzy-backend'

export type { PlanDetailDto, PlanListFilters, PlanListItem, PlanListResult, PlanSort, CountryListItem, RegionListItem }

/**
 * Effective price to charge the user — uses `sellingPriceUsd` when the pricing
 * engine has populated it, otherwise the raw catalog cost (Phase 4D wires the
 * engine; for now both look the same to the UI).
 */
export function displayPriceUsd(plan: { sellingPriceUsd: number | null; costUsd: number }): number {
  return plan.sellingPriceUsd ?? plan.costUsd
}

/* ─── Query string builder ──────────────────────────────────────────────── */

function buildQuery(params: PlanListParams): string {
  const sp = new URLSearchParams()
  const f = params.filters ?? {}

  if (f.q) sp.set('q', f.q)
  if (f.country) sp.set('country', f.country)
  if (f.region) sp.set('region', f.region)
  if (f.provider) sp.set('provider', f.provider)
  if (f.data) sp.set('data', f.data)
  if (f.duration) sp.set('duration', f.duration)
  if (f.minDays !== undefined) sp.set('minDays', String(f.minDays))
  if (f.maxDays !== undefined) sp.set('maxDays', String(f.maxDays))
  if (f.minPriceUsd !== undefined) sp.set('minPriceUsd', String(f.minPriceUsd))
  if (f.maxPriceUsd !== undefined) sp.set('maxPriceUsd', String(f.maxPriceUsd))
  if (params.sort) sp.set('sort', params.sort)
  if (params.page !== undefined) sp.set('page', String(params.page))
  if (params.perPage !== undefined) sp.set('perPage', String(params.perPage))

  return sp.toString()
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: 'no-store' })
  if (!res.ok) {
    let detail: string | undefined
    try { detail = (await res.json())?.error } catch {}
    throw new Error(detail ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

/* ─── Plans ─────────────────────────────────────────────────────────────── */

export function fetchPlans(
  params: PlanListParams = {},
  signal?: AbortSignal,
): Promise<PlanListResult> {
  const qs = buildQuery(params)
  return getJson<PlanListResult>(`/api/plans${qs ? `?${qs}` : ''}`, signal)
}

export async function fetchPlanBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<PlanDetailDto | null> {
  try {
    const { plan } = await getJson<{ plan: PlanDetailDto }>(
      `/api/plans/${encodeURIComponent(slug)}`,
      signal,
    )
    return plan
  } catch (e) {
    if ((e as Error).message?.includes('404') || (e as Error).message === 'Plan not found') {
      return null
    }
    throw e
  }
}

export function searchPlans(
  q: string,
  params: Omit<PlanListParams, 'filters'> & { filters?: Omit<PlanListFilters, 'q'> } = {},
  signal?: AbortSignal,
): Promise<PlanListResult & { query: string }> {
  const sp = new URLSearchParams()
  sp.set('q', q)
  const wrapped: PlanListParams = { ...params, filters: { ...(params.filters ?? {}) } }
  const inner = buildQuery(wrapped)
  if (inner) for (const [k, v] of new URLSearchParams(inner)) sp.set(k, v)
  return getJson(`/api/plans/search?${sp.toString()}`, signal)
}

/* ─── Reference data ────────────────────────────────────────────────────── */

export function fetchCountries(
  filters: { region?: string; q?: string; withPlansOnly?: boolean } = {},
  signal?: AbortSignal,
): Promise<CountryListItem[]> {
  const sp = new URLSearchParams()
  if (filters.region) sp.set('region', filters.region)
  if (filters.q) sp.set('q', filters.q)
  if (filters.withPlansOnly) sp.set('withPlansOnly', '1')
  const qs = sp.toString()
  return getJson<{ countries: CountryListItem[] }>(`/api/countries${qs ? `?${qs}` : ''}`, signal)
    .then((r) => r.countries)
}

export function fetchRegions(signal?: AbortSignal): Promise<RegionListItem[]> {
  return getJson<{ regions: RegionListItem[] }>(`/api/regions`, signal).then((r) => r.regions)
}

export type PlanListItemOrDetail = PlanListItem | PlanDetailDto

/* ─── Filter UI ↔ API mapping helpers ───────────────────────────────────── */

/** Map storefront region UI labels (Asia, Europe, ...) → backend region codes. */
export const REGION_LABEL_TO_CODE: Record<string, string> = {
  'All':         '',
  'Asia':        'asia',
  'Europe':      'europe',
  'Americas':    'north-america', // mock & UI collapse N/S — match the import.
  'Middle East': 'middle-east',
  'Africa':      'africa',
  'Oceania':     'oceania',
  'Global':      'global',
}

/** Map storefront duration UI labels → backend duration bucket keys. */
export const DURATION_LABEL_TO_BUCKET: Record<string, PlanListFilters['duration'] | undefined> = {
  'All':         undefined,
  '1–7 days':    '1-7',
  '7–15 days':   '7-15',
  '15–30 days':  '15-30',
  '30+ days':    '30+',
}
