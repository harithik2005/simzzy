/**
 * Browser-side account API client.
 *
 * Every endpoint requires an authenticated session; the server returns 401 if
 * unauthenticated, 400 on validation errors, 404 on not-found. The caller is
 * responsible for surfacing those — this module just throws a friendly Error.
 */
import type {
  AccountEsimDto,
  AccountOrderDto,
  DashboardSummaryDto,
  PreferencesDto,
  ProfileDto,
  TicketCategory,
  TicketDetailDto,
  TicketSummaryDto,
} from 'simzzy-backend'

export type {
  AccountEsimDto,
  AccountOrderDto,
  DashboardSummaryDto,
  PreferencesDto,
  ProfileDto,
  TicketCategory,
  TicketDetailDto,
  TicketSummaryDto,
}

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

/* ─── Profile ───────────────────────────────────────────────────────────── */

export function fetchProfile() {
  return jsonFetch<{ profile: ProfileDto }>('/api/account/profile').then((r) => r.profile)
}

export function updateProfile(patch: Partial<{
  name: string | null
  phone: string | null
  countryCode: string | null
  timezone: string | null
}>) {
  return jsonFetch<{ profile: ProfileDto }>('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(patch),
  }).then((r) => r.profile)
}

/* ─── Password ──────────────────────────────────────────────────────────── */

export function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return jsonFetch<{ ok: true }>('/api/account/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/* ─── Preferences ───────────────────────────────────────────────────────── */

export function fetchPreferences() {
  return jsonFetch<{ preferences: PreferencesDto }>('/api/account/preferences').then((r) => r.preferences)
}

export function updatePreferences(patch: Partial<PreferencesDto>) {
  return jsonFetch<{ preferences: PreferencesDto }>('/api/account/preferences', {
    method: 'PUT',
    body: JSON.stringify(patch),
  }).then((r) => r.preferences)
}

/* ─── Dashboard ─────────────────────────────────────────────────────────── */

export function fetchDashboard() {
  return jsonFetch<{ summary: DashboardSummaryDto }>('/api/account/dashboard').then((r) => r.summary)
}

/* ─── Orders + eSIMs ────────────────────────────────────────────────────── */

export function fetchMyOrders() {
  return jsonFetch<{ orders: AccountOrderDto[] }>('/api/account/orders').then((r) => r.orders)
}

export function fetchMyEsims() {
  return jsonFetch<{ esims: AccountEsimDto[] }>('/api/account/esims').then((r) => r.esims)
}

/* ─── Support ───────────────────────────────────────────────────────────── */

export function fetchMyTickets() {
  return jsonFetch<{ tickets: TicketSummaryDto[] }>('/api/support/tickets').then((r) => r.tickets)
}

export function fetchTicket(id: string) {
  return jsonFetch<{ ticket: TicketDetailDto }>(`/api/support/tickets/${id}`).then((r) => r.ticket)
}

export function createTicket(payload: {
  category: TicketCategory
  subject: string
  body: string
  orderId?: string | null
}) {
  return jsonFetch<{ ticket: TicketDetailDto }>('/api/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.ticket)
}

export function postTicketMessage(ticketId: string, body: string) {
  return jsonFetch<{ message: TicketDetailDto['messages'][number] }>(
    `/api/support/tickets/${ticketId}/messages`,
    { method: 'POST', body: JSON.stringify({ body }) },
  ).then((r) => r.message)
}
