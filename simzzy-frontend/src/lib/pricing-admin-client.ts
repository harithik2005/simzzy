/**
 * Browser-side admin pricing API client.
 *
 * All endpoints are gated by `requireAdminApi()` on the server and return
 * 401/403 if the session isn't an ADMIN/SUPER_ADMIN. Mutations return the
 * updated row; callers should refetch the rule set after mutating so cached
 * prices (which the backend updated server-side) reflect in the UI.
 */
import type {
  PricingRuleSetDto,
  PricingStatsDto,
  PricingAuditEntry,
} from 'simzzy-backend'

export type { PricingRuleSetDto, PricingStatsDto, PricingAuditEntry }

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let detail: string | undefined
    try { detail = (await res.json())?.error } catch {}
    throw new Error(detail ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

/* ─── Read ──────────────────────────────────────────────────────────────── */

export function fetchRuleSet(): Promise<{ ruleSet: PricingRuleSetDto; stats: PricingStatsDto }> {
  return jsonFetch('/api/admin/pricing')
}

export function fetchAuditLog(limit = 25): Promise<{ entries: PricingAuditEntry[] }> {
  return jsonFetch(`/api/admin/pricing/audit?limit=${limit}`)
}

/* ─── Mutations ─────────────────────────────────────────────────────────── */

export function saveGlobalRule(payload: {
  profitUsd: number
  isActive?: boolean
  note?: string | null
}) {
  return jsonFetch('/api/admin/pricing/global', { method: 'PUT', body: JSON.stringify(payload) })
}

export function upsertCountryRule(payload: {
  countryId: string
  profitUsd: number
  isActive?: boolean
}) {
  return jsonFetch('/api/admin/pricing/country', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCountryRule(
  id: string,
  payload: { profitUsd?: number; isActive?: boolean },
) {
  return jsonFetch(`/api/admin/pricing/country/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteCountryRule(id: string) {
  return jsonFetch<{ ok: true }>(`/api/admin/pricing/country/${id}`, { method: 'DELETE' })
}

export function createDurationRule(payload: {
  label: string
  minDays: number
  maxDays: number | null
  profitUsd: number
  isActive?: boolean
}) {
  return jsonFetch('/api/admin/pricing/duration', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateDurationRule(
  id: string,
  payload: Partial<{ label: string; minDays: number; maxDays: number | null; profitUsd: number; isActive: boolean }>,
) {
  return jsonFetch(`/api/admin/pricing/duration/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteDurationRule(id: string) {
  return jsonFetch<{ ok: true }>(`/api/admin/pricing/duration/${id}`, { method: 'DELETE' })
}

export function upsertPlanOverride(payload: {
  planId: string
  fixedPriceUsd: number
  reason?: string | null
  isActive?: boolean
}) {
  return jsonFetch('/api/admin/pricing/override', { method: 'POST', body: JSON.stringify(payload) })
}

export function deletePlanOverride(id: string) {
  return jsonFetch<{ ok: true }>(`/api/admin/pricing/override/${id}`, { method: 'DELETE' })
}
