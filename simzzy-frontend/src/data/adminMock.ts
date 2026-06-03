/* ─── Admin Panel Mock Data ─────────────────────────────────────────────────
 *
 * Phase 4G connected every admin page to live backend services. The only
 * remaining mock here is the topbar notification feed — there is no
 * Notification model yet, so the bell shows representative items until a
 * notifications backend lands in a later phase. Everything else (dashboard,
 * users, orders, plans, payments, reviews, faqs, settings, providers, pricing,
 * support, audit, health) now reads from `/api/admin/*`.
 * ─────────────────────────────────────────────────────────────────────────── */

export type AdminNotification = {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
}

/** Topbar bell feed (placeholder until a notifications backend exists). */
export const notifications: AdminNotification[] = [
  { id: 'n-1', title: 'New order',        body: 'A customer completed a purchase',           time: '12m ago', unread: true  },
  { id: 'n-2', title: 'Refund requested', body: 'A refund is awaiting review',                time: '1h ago',  unread: true  },
  { id: 'n-3', title: 'Provider notice',  body: 'High latency detected on an eSIM endpoint',  time: '4h ago',  unread: true  },
  { id: 'n-4', title: 'New user signup',  body: 'A new customer joined Simzzy',               time: '1d ago',  unread: false },
]
