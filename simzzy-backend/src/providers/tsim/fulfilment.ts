/**
 * tSIM order fulfilment — Phase 4H.2B.
 *
 * Turns a paid Simzzy order into real eSIM(s) via tSIM:
 *   ORDER_SUBMITTED → QR_PENDING
 *     → esimSubscribe(channel_dataplan_id) per order item   ⚠️ BILLABLE
 *     → poll topupDetail(topup_id) until lpa_str/qrcode ready
 *     → create the Esim record (iccid / qrCodeUrl / activationCode)
 *   → QR_RECEIVED → DELIVERED
 * On any failure → FAILED (+ audit reason).
 *
 * Idempotent: order items that already have an Esim are skipped, so a retry
 * won't double-charge for items already provisioned.
 *
 * This is gated by the caller (TSIM_FULFILMENT_ENABLED) — when off, the dummy
 * fulfilment path runs instead and this is never invoked.
 */
import { ActorType, EsimStatus, OrderStatus } from '@prisma/client'
import { prisma } from '../../../client'
import { transitionStatus } from '../../orders/service'
import { TsimClient } from './client'

export interface FulfilResult {
  ok: boolean
  orderStatus: OrderStatus
  esimsCreated: number
  error?: string
}

// tSIM provisioning is async; poll the topup for the QR/LPA. ~30s worst case.
const POLL_ATTEMPTS = 12
const POLL_DELAY_MS = 2_500

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fulfilOrderViaTsim(
  orderId: string,
  actor: { actorId: string | null },
): Promise<FulfilResult> {
  const sys = {
    actorId: actor.actorId,
    actorType: actor.actorId ? ActorType.USER : ActorType.SYSTEM,
  } as const

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      items: { select: { id: true, planEsimId: true, quantity: true, esim: { select: { id: true } } } },
    },
  })
  if (!order) return { ok: false, orderStatus: OrderStatus.FAILED, esimsCreated: 0, error: 'order not found' }

  const client = new TsimClient()

  try {
    if (order.status === OrderStatus.ORDER_SUBMITTED) {
      await transitionStatus(orderId, OrderStatus.QR_PENDING, { ...sys, reason: 'Submitting eSIM order to tSIM' })
    }

    let created = 0
    for (const item of order.items) {
      if (item.esim) continue // already provisioned — idempotent skip

      // ⚠️ Real, billable purchase. `planEsimId` is the snapshot of the plan's
      // provider code; it must equal tSIM's channel_dataplan_id.
      const sub = await client.esimSubscribe({ channelDataplanId: item.planEsimId, number: item.quantity })
      if (sub.code !== 1 || !sub.result?.topup_id) {
        throw new Error(`esimSubscribe failed for ${item.planEsimId}: code=${sub.code} ${sub.message}`)
      }
      const topupId = sub.result.topup_id

      // Poll until the QR/LPA is ready.
      let detail: NonNullable<Awaited<ReturnType<TsimClient['topupDetail']>>['result']> | null = null
      for (let i = 0; i < POLL_ATTEMPTS; i++) {
        const d = await client.topupDetail(topupId)
        if (d.code === 1 && d.result && Array.isArray(d.result.lpa_str) && d.result.lpa_str.length > 0) {
          detail = d.result
          break
        }
        if (i < POLL_ATTEMPTS - 1) await sleep(POLL_DELAY_MS)
      }
      if (!detail) throw new Error(`QR not ready after ${POLL_ATTEMPTS} polls (topup_id=${topupId})`)

      await prisma.esim.create({
        data: {
          orderItemId: item.id,
          userId: order.userId,
          iccid: detail.operator_iccids?.[0] ?? detail.device_ids?.[0] ?? null,
          qrCodeUrl: detail.qrcode?.[0] ?? null,
          qrCodeData: detail.lpa_str?.[0] ?? null,
          activationCode: detail.lpa_str?.[0] ?? null,
          status: EsimStatus.PROVISIONED,
        },
      })
      created++
      // NOTE: quantity>1 provisions multiple eSIMs under one topup_id but the
      // Esim<->OrderItem relation is 1:1, so only the first is recorded today.
      // Checkout is single-quantity per item, so this is fine for now.
    }

    await transitionStatus(orderId, OrderStatus.QR_RECEIVED, { ...sys, reason: 'eSIM QR received from tSIM' })
    await transitionStatus(orderId, OrderStatus.DELIVERED, { ...sys, reason: 'eSIM delivered to customer' })
    return { ok: true, orderStatus: OrderStatus.DELIVERED, esimsCreated: created }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    try {
      await transitionStatus(orderId, OrderStatus.FAILED, { ...sys, reason: `tSIM fulfilment failed: ${msg}`.slice(0, 200) })
    } catch {
      /* transition may be illegal from current state — best effort */
    }
    return { ok: false, orderStatus: OrderStatus.FAILED, esimsCreated: 0, error: msg }
  }
}
