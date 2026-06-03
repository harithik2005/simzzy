import type { Role } from '@prisma/client'

// Re-exported for module consumers; `Role` import keeps the type-only import
// graph stable across modules that consume this file.
export type _RoleAnchor = Role

/* ─── Filters / pagination / sort ───────────────────────────────────────── */

export type PlanSort = 'popular' | 'price-asc' | 'price-desc' | 'data-desc' | 'duration-desc'

export type PlanListFilters = {
  q?: string
  /** ISO 3166-1 alpha-2 country code or canonical country name. */
  country?: string
  /** Region code or name. */
  region?: string
  /** Provider slug, e.g. 'tsim'. */
  provider?: string
  /** Free-text data filter like '5GB', '20GB+', 'Unlimited'. */
  data?: string
  /** Duration bucket label OR explicit `minDays`/`maxDays`. */
  duration?: '1-7' | '7-15' | '15-30' | '30+'
  minDays?: number
  maxDays?: number
  /** Price bounds against the catalog cost (USD). */
  minPriceUsd?: number
  maxPriceUsd?: number
}

export type PlanListParams = {
  filters?: PlanListFilters
  page?: number
  perPage?: number
  sort?: PlanSort
}

/* ─── Output DTOs ───────────────────────────────────────────────────────── */

export type PlanListItem = {
  id: string
  slug: string
  esimId: string
  name: string
  data: string
  days: number
  speed: string | null
  network: string | null
  popular: boolean
  badge: string | null
  /** Wholesale cost (raw catalog value). */
  costUsd: number
  /** Selling price once the pricing engine populates it (Phase 4D). Null today. */
  sellingPriceUsd: number | null
  region: { code: string; name: string } | null
  country: string | null
  flag: string | null
}

export type PlanListResult = {
  items: PlanListItem[]
  page: number
  perPage: number
  total: number
  totalPages: number
}

export type PlanDetailDto = PlanListItem & {
  fup: string | null
  apn: string | null
  provider: { slug: string; name: string }
  destinations: Array<{ code: string; name: string; flag: string | null }>
}
