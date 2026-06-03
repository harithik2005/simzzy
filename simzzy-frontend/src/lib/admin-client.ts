/**
 * Browser-side admin API client. Every endpoint is RBAC-gated server-side
 * (ADMIN+, with role mutations restricted to SUPER_ADMIN). 401 = not signed in,
 * 403 = signed in but not allowed.
 */
import type {
  AdminDashboardSummary,
  AdminUserListItem,
  AdminUserDetail,
  EsimProviderDto,
  PaymentProviderDto,
  AuditLogEntryDto,
  AdminTicketSummary,
  AdminTicketDetail,
  SystemHealthReport,
  AdminFaqDto,
  AdminReviewDto,
  ReviewStatsDto,
  AdminPaymentDto,
  AdminPaymentDetailDto,
  PaymentStatsDto,
  AdminPlanDto,
  PlanFilterOptions,
  SyncPreparationDto,
  SettingDto,
} from 'simzzy-backend'

export type {
  AdminDashboardSummary,
  AdminUserListItem,
  AdminUserDetail,
  EsimProviderDto,
  PaymentProviderDto,
  AuditLogEntryDto,
  AdminTicketSummary,
  AdminTicketDetail,
  SystemHealthReport,
  AdminFaqDto,
  AdminReviewDto,
  ReviewStatsDto,
  AdminPaymentDto,
  AdminPaymentDetailDto,
  PaymentStatsDto,
  AdminPlanDto,
  PlanFilterOptions,
  SyncPreparationDto,
  SettingDto,
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

/* ─── Dashboard ─────────────────────────────────────────────────────────── */
export function fetchAdminDashboard() {
  return jsonFetch<{ summary: AdminDashboardSummary }>('/api/admin/dashboard').then((r) => r.summary)
}

/* ─── Users ─────────────────────────────────────────────────────────────── */
export function fetchAdminUsers(filters: { q?: string; status?: string; role?: string } = {}) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.status) sp.set('status', filters.status)
  if (filters.role) sp.set('role', filters.role)
  const qs = sp.toString()
  return jsonFetch<{ users: AdminUserListItem[] }>(`/api/admin/users${qs ? `?${qs}` : ''}`).then((r) => r.users)
}
export function fetchAdminUser(id: string) {
  return jsonFetch<{ user: AdminUserDetail }>(`/api/admin/users/${id}`).then((r) => r.user)
}
export function setAdminUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
  return jsonFetch<{ user: AdminUserListItem }>(`/api/admin/users/${id}/status`, {
    method: 'PUT', body: JSON.stringify({ status }),
  }).then((r) => r.user)
}
export function setAdminUserRole(id: string, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
  return jsonFetch<{ user: AdminUserListItem }>(`/api/admin/users/${id}/role`, {
    method: 'PUT', body: JSON.stringify({ role }),
  }).then((r) => r.user)
}

/* ─── Providers ─────────────────────────────────────────────────────────── */
export function fetchProviders() {
  return jsonFetch<{ esim: EsimProviderDto[]; payment: PaymentProviderDto[] }>('/api/admin/providers')
}
export function setEsimProviderStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  return jsonFetch<{ provider: unknown }>(`/api/admin/providers/esim/${id}`, {
    method: 'PUT', body: JSON.stringify({ status }),
  })
}
export function setPaymentProviderStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  return jsonFetch<{ provider: unknown }>(`/api/admin/providers/payment/${id}`, {
    method: 'PUT', body: JSON.stringify({ status }),
  })
}

/* ─── Audit ─────────────────────────────────────────────────────────────── */
export function fetchAuditLog(filters: { entity?: string; q?: string; dateFrom?: string; dateTo?: string } = {}, limit = 100) {
  const sp = new URLSearchParams()
  if (filters.entity) sp.set('entity', filters.entity)
  if (filters.q) sp.set('q', filters.q)
  if (filters.dateFrom) sp.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) sp.set('dateTo', filters.dateTo)
  sp.set('limit', String(limit))
  return jsonFetch<{ entries: AuditLogEntryDto[]; entities: string[] }>(`/api/admin/audit?${sp.toString()}`)
}

/* ─── Support ───────────────────────────────────────────────────────────── */
export function fetchAdminTickets(filters: { status?: string; q?: string; priority?: string } = {}) {
  const sp = new URLSearchParams()
  if (filters.status) sp.set('status', filters.status)
  if (filters.q) sp.set('q', filters.q)
  if (filters.priority) sp.set('priority', filters.priority)
  const qs = sp.toString()
  return jsonFetch<{ tickets: AdminTicketSummary[] }>(`/api/admin/support/tickets${qs ? `?${qs}` : ''}`).then((r) => r.tickets)
}
export function fetchAdminTicket(id: string) {
  return jsonFetch<{ ticket: AdminTicketDetail }>(`/api/admin/support/tickets/${id}`).then((r) => r.ticket)
}
export function replyToAdminTicket(id: string, body: string) {
  return jsonFetch(`/api/admin/support/tickets/${id}/reply`, {
    method: 'POST', body: JSON.stringify({ body }),
  })
}
export function setAdminTicketStatus(id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
  return jsonFetch<{ ticket: AdminTicketDetail }>(`/api/admin/support/tickets/${id}/status`, {
    method: 'PUT', body: JSON.stringify({ status }),
  }).then((r) => r.ticket)
}

/* ─── Health ────────────────────────────────────────────────────────────── */
export function fetchHealth() {
  return jsonFetch<SystemHealthReport>('/api/admin/health')
}

/* ─── Orders (admin extras) ─────────────────────────────────────────────── */
export function addOrderInternalNote(id: string, body: string) {
  return jsonFetch<{ ok: true }>(`/api/admin/orders/${id}/note`, { method: 'POST', body: JSON.stringify({ body }) })
}
export function retryAdminOrder(id: string) {
  return jsonFetch(`/api/admin/orders/${id}/retry`, { method: 'POST' })
}

/* ─── FAQs ──────────────────────────────────────────────────────────────── */
export function fetchAdminFaqs(filters: { q?: string; category?: string; published?: boolean } = {}) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.category) sp.set('category', filters.category)
  if (typeof filters.published === 'boolean') sp.set('published', String(filters.published))
  const qs = sp.toString()
  return jsonFetch<{ faqs: AdminFaqDto[]; categories: string[] }>(`/api/admin/faqs${qs ? `?${qs}` : ''}`)
}
export function createAdminFaq(input: { category: string; question: string; answer: string; isPublished?: boolean }) {
  return jsonFetch<{ faq: AdminFaqDto }>('/api/admin/faqs', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.faq)
}
export function updateAdminFaq(id: string, input: { category: string; question: string; answer: string; isPublished?: boolean }) {
  return jsonFetch<{ faq: AdminFaqDto }>(`/api/admin/faqs/${id}`, { method: 'PUT', body: JSON.stringify(input) }).then((r) => r.faq)
}
export function setAdminFaqPublished(id: string, isPublished: boolean) {
  return jsonFetch<{ faq: AdminFaqDto }>(`/api/admin/faqs/${id}/publish`, { method: 'PUT', body: JSON.stringify({ isPublished }) }).then((r) => r.faq)
}
export function deleteAdminFaq(id: string) {
  return jsonFetch<{ ok: true }>(`/api/admin/faqs/${id}`, { method: 'DELETE' })
}
export function reorderAdminFaqs(category: string, orderedIds: string[]) {
  return jsonFetch<{ faqs: AdminFaqDto[] }>('/api/admin/faqs/reorder', { method: 'PUT', body: JSON.stringify({ category, orderedIds }) }).then((r) => r.faqs)
}

/* ─── Reviews ───────────────────────────────────────────────────────────── */
export function fetchAdminReviews(filters: { q?: string; status?: string } = {}) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.status) sp.set('status', filters.status)
  const qs = sp.toString()
  return jsonFetch<{ reviews: AdminReviewDto[]; stats: ReviewStatsDto }>(`/api/admin/reviews${qs ? `?${qs}` : ''}`)
}
export function setAdminReviewStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  return jsonFetch<{ review: AdminReviewDto }>(`/api/admin/reviews/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }).then((r) => r.review)
}
export function setAdminReviewHidden(id: string, hidden: boolean) {
  return jsonFetch<{ review: AdminReviewDto }>(`/api/admin/reviews/${id}/hide`, { method: 'PUT', body: JSON.stringify({ hidden }) }).then((r) => r.review)
}
export function deleteAdminReview(id: string) {
  return jsonFetch<{ ok: true }>(`/api/admin/reviews/${id}`, { method: 'DELETE' })
}

/* ─── Payments ──────────────────────────────────────────────────────────── */
export function fetchAdminPayments(filters: { q?: string; status?: string } = {}) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.status) sp.set('status', filters.status)
  const qs = sp.toString()
  return jsonFetch<{ payments: AdminPaymentDto[]; stats: PaymentStatsDto }>(`/api/admin/payments${qs ? `?${qs}` : ''}`)
}
export function fetchAdminPayment(id: string) {
  return jsonFetch<{ payment: AdminPaymentDetailDto }>(`/api/admin/payments/${id}`).then((r) => r.payment)
}

/* ─── Plans (catalog) ───────────────────────────────────────────────────── */
export function fetchAdminPlans(filters: { q?: string; providerId?: string; regionId?: string; active?: boolean } = {}) {
  const sp = new URLSearchParams()
  if (filters.q) sp.set('q', filters.q)
  if (filters.providerId) sp.set('providerId', filters.providerId)
  if (filters.regionId) sp.set('regionId', filters.regionId)
  if (typeof filters.active === 'boolean') sp.set('active', String(filters.active))
  const qs = sp.toString()
  return jsonFetch<{ plans: AdminPlanDto[]; options: PlanFilterOptions }>(`/api/admin/plans${qs ? `?${qs}` : ''}`)
}
export function setAdminPlanActive(id: string, isActive: boolean) {
  return jsonFetch<{ plan: AdminPlanDto }>(`/api/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }).then((r) => r.plan)
}
export function prepareAdminPlanSync(providerId: string) {
  return jsonFetch<{ report: SyncPreparationDto }>('/api/admin/plans/sync', { method: 'POST', body: JSON.stringify({ providerId }) }).then((r) => r.report)
}

/* ─── Settings ──────────────────────────────────────────────────────────── */
export function fetchAdminSettings() {
  return jsonFetch<{ settings: SettingDto[] }>('/api/admin/settings').then((r) => r.settings)
}
export function updateAdminSettings(updates: Record<string, string | number | boolean>) {
  return jsonFetch<{ settings: SettingDto[] }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ updates }) }).then((r) => r.settings)
}
