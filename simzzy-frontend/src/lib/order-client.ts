/**
 * Browser-side order API client. All endpoints require an authenticated session
 * (Customer or Admin). Errors bubble as plain Error with the server's message.
 */
import type { OrderDetailDto } from 'simzzy-backend'

export type { OrderDetailDto }

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let detail: string | undefined
    try { detail = (await res.json())?.error } catch {}
    const err = new Error(detail ?? `Request failed (${res.status})`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export function createOrder(payload: {
  planSlug: string
  customerEmail: string
  customerName?: string | null
  customerPhone?: string | null
  currency: string
  discountUsd?: number
}) {
  return jsonFetch<{ order: OrderDetailDto }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.order)
}

export function payOrder(orderId: string, payload: { method?: string; succeed?: boolean } = {}) {
  return jsonFetch<{ paymentId: string; paymentStatus: string; orderStatus: string }>(
    `/api/orders/${orderId}/pay`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function cancelOrder(orderId: string) {
  return jsonFetch<{ order: OrderDetailDto }>(`/api/orders/${orderId}/cancel`, { method: 'POST' }).then((r) => r.order)
}

export function fetchMyOrderDetail(orderId: string) {
  return jsonFetch<{ order: OrderDetailDto }>(`/api/account/orders/${orderId}`).then((r) => r.order)
}
