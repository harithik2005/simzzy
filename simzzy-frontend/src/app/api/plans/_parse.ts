import type { PlanListFilters, PlanListParams, PlanSort } from 'simzzy-backend'

const ALLOWED_SORTS: ReadonlySet<PlanSort> = new Set([
  'popular',
  'price-asc',
  'price-desc',
  'data-desc',
  'duration-desc',
])

const ALLOWED_DURATIONS = new Set(['1-7', '7-15', '15-30', '30+'])

function num(value: string | null): number | undefined {
  if (value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Parse `URLSearchParams` (from `request.nextUrl`) into the shape
 * `listPlans` expects. Unknown keys are ignored; invalid values fall back to
 * sensible defaults so a typo in a query string never 500s.
 */
export function parsePlanListParams(sp: URLSearchParams): PlanListParams {
  const filters: PlanListFilters = {}

  const q = sp.get('q')?.trim()
  if (q) filters.q = q

  const country = sp.get('country')?.trim()
  if (country) filters.country = country

  const region = sp.get('region')?.trim()
  if (region) filters.region = region

  const provider = sp.get('provider')?.trim()
  if (provider) filters.provider = provider

  const data = sp.get('data')?.trim()
  if (data) filters.data = data

  const duration = sp.get('duration')?.trim()
  if (duration && ALLOWED_DURATIONS.has(duration)) {
    filters.duration = duration as PlanListFilters['duration']
  }

  const minDays = num(sp.get('minDays'))
  if (minDays !== undefined) filters.minDays = minDays
  const maxDays = num(sp.get('maxDays'))
  if (maxDays !== undefined) filters.maxDays = maxDays

  const minPriceUsd = num(sp.get('minPriceUsd'))
  if (minPriceUsd !== undefined) filters.minPriceUsd = minPriceUsd
  const maxPriceUsd = num(sp.get('maxPriceUsd'))
  if (maxPriceUsd !== undefined) filters.maxPriceUsd = maxPriceUsd

  const sortRaw = sp.get('sort')
  const sort: PlanSort = sortRaw && ALLOWED_SORTS.has(sortRaw as PlanSort)
    ? (sortRaw as PlanSort)
    : 'popular'

  const page = Math.max(1, num(sp.get('page')) ?? 1)
  const perPage = Math.min(100, Math.max(1, num(sp.get('perPage')) ?? 24))

  return { filters, sort, page, perPage }
}
