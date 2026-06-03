import { Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { logPricingChange, PRICING_ACTIONS, PRICING_ENTITIES } from './audit'
import {
  refreshAllCaches,
  refreshCachesForCountry,
  refreshCachesForDuration,
  refreshPlanCache,
} from './service'

/**
 * Pricing mutations. Every function in this module:
 *   1. Reads the current row (for the audit `before`).
 *   2. Performs the write.
 *   3. Refreshes the affected `plans.cachedSellingPriceUsd` rows.
 *   4. Writes an `audit_logs` entry tagged with the actor.
 *
 * Cache invalidation rules:
 *   - Global rule changes → refresh every active plan.
 *   - Country rule changes → refresh plans whose primaryCountryId matches.
 *   - Duration rule changes → refresh plans whose `days` fall in the range.
 *     For range edits we refresh BOTH the old and the new range so transitions
 *     don't leave stale rows.
 *   - Override changes → refresh the single affected plan.
 *
 * Cache refresh and audit logging happen AFTER the write succeeds, so an error
 * in either of them won't roll back a valid rule change.
 */

export type ActorContext = {
  actorId: string | null
  ip?: string | null
  userAgent?: string | null
}

function num(v: Prisma.Decimal): number {
  return Number(v)
}

/* ─── Global ────────────────────────────────────────────────────────────── */

export type UpdateGlobalInput = {
  profitUsd: number
  isActive?: boolean
  note?: string | null
}

export async function updateGlobalRule(
  input: UpdateGlobalInput,
  actor: ActorContext,
) {
  const before = await prisma.pricingGlobalRule.findUnique({ where: { id: 1 } })

  const after = await prisma.pricingGlobalRule.upsert({
    where: { id: 1 },
    update: {
      profitUsd: input.profitUsd,
      isActive: input.isActive ?? before?.isActive ?? true,
      note: input.note ?? before?.note ?? null,
      updatedById: actor.actorId,
    },
    create: {
      id: 1,
      singleton: true,
      profitUsd: input.profitUsd,
      isActive: input.isActive ?? true,
      note: input.note ?? null,
      updatedById: actor.actorId,
    },
  })

  await refreshAllCaches()
  await logPricingChange({
    ...actor,
    action: PRICING_ACTIONS.UPDATE,
    entity: PRICING_ENTITIES.GLOBAL,
    entityId: '1',
    before: before
      ? { profitUsd: num(before.profitUsd), isActive: before.isActive, note: before.note }
      : null,
    after: { profitUsd: num(after.profitUsd), isActive: after.isActive, note: after.note },
  })

  return after
}

/* ─── Country ───────────────────────────────────────────────────────────── */

export type UpsertCountryInput = {
  countryId: string
  profitUsd: number
  isActive?: boolean
}

export async function upsertCountryRule(
  input: UpsertCountryInput,
  actor: ActorContext,
) {
  const before = await prisma.pricingCountryRule.findUnique({
    where: { countryId: input.countryId },
  })

  const after = await prisma.pricingCountryRule.upsert({
    where: { countryId: input.countryId },
    update: {
      profitUsd: input.profitUsd,
      isActive: input.isActive ?? before?.isActive ?? true,
    },
    create: {
      countryId: input.countryId,
      profitUsd: input.profitUsd,
      isActive: input.isActive ?? true,
    },
  })

  await refreshCachesForCountry(input.countryId)
  await logPricingChange({
    ...actor,
    action: before ? PRICING_ACTIONS.UPDATE : PRICING_ACTIONS.CREATE,
    entity: PRICING_ENTITIES.COUNTRY,
    entityId: after.id,
    before: before
      ? { countryId: before.countryId, profitUsd: num(before.profitUsd), isActive: before.isActive }
      : null,
    after: { countryId: after.countryId, profitUsd: num(after.profitUsd), isActive: after.isActive },
  })

  return after
}

export async function deleteCountryRule(id: string, actor: ActorContext) {
  const before = await prisma.pricingCountryRule.findUnique({ where: { id } })
  if (!before) return null

  await prisma.pricingCountryRule.delete({ where: { id } })
  await refreshCachesForCountry(before.countryId)
  await logPricingChange({
    ...actor,
    action: PRICING_ACTIONS.DELETE,
    entity: PRICING_ENTITIES.COUNTRY,
    entityId: id,
    before: { countryId: before.countryId, profitUsd: num(before.profitUsd), isActive: before.isActive },
    after: null,
  })
  return before
}

/* ─── Duration ──────────────────────────────────────────────────────────── */

export type CreateDurationInput = {
  label: string
  minDays: number
  maxDays: number | null
  profitUsd: number
  isActive?: boolean
}

export async function createDurationRule(
  input: CreateDurationInput,
  actor: ActorContext,
) {
  const after = await prisma.pricingDurationRule.create({
    data: {
      label: input.label,
      minDays: input.minDays,
      maxDays: input.maxDays,
      profitUsd: input.profitUsd,
      isActive: input.isActive ?? true,
    },
  })
  await refreshCachesForDuration(input.minDays, input.maxDays)
  await logPricingChange({
    ...actor,
    action: PRICING_ACTIONS.CREATE,
    entity: PRICING_ENTITIES.DURATION,
    entityId: after.id,
    before: null,
    after: {
      label: after.label, minDays: after.minDays, maxDays: after.maxDays,
      profitUsd: num(after.profitUsd), isActive: after.isActive,
    },
  })
  return after
}

export type UpdateDurationInput = Partial<CreateDurationInput>

export async function updateDurationRule(
  id: string,
  input: UpdateDurationInput,
  actor: ActorContext,
) {
  const before = await prisma.pricingDurationRule.findUnique({ where: { id } })
  if (!before) return null

  const after = await prisma.pricingDurationRule.update({
    where: { id },
    data: {
      label:     input.label     ?? before.label,
      minDays:   input.minDays   ?? before.minDays,
      maxDays:   input.maxDays   === undefined ? before.maxDays : input.maxDays,
      profitUsd: input.profitUsd ?? num(before.profitUsd),
      isActive:  input.isActive  ?? before.isActive,
    },
  })

  // Refresh BOTH the old and new ranges so a range-shift doesn't leave stale rows.
  await refreshCachesForDuration(before.minDays, before.maxDays)
  if (after.minDays !== before.minDays || after.maxDays !== before.maxDays) {
    await refreshCachesForDuration(after.minDays, after.maxDays)
  }

  await logPricingChange({
    ...actor,
    action: PRICING_ACTIONS.UPDATE,
    entity: PRICING_ENTITIES.DURATION,
    entityId: id,
    before: {
      label: before.label, minDays: before.minDays, maxDays: before.maxDays,
      profitUsd: num(before.profitUsd), isActive: before.isActive,
    },
    after: {
      label: after.label, minDays: after.minDays, maxDays: after.maxDays,
      profitUsd: num(after.profitUsd), isActive: after.isActive,
    },
  })
  return after
}

export async function deleteDurationRule(id: string, actor: ActorContext) {
  const before = await prisma.pricingDurationRule.findUnique({ where: { id } })
  if (!before) return null

  await prisma.pricingDurationRule.delete({ where: { id } })
  await refreshCachesForDuration(before.minDays, before.maxDays)
  await logPricingChange({
    ...actor,
    action: PRICING_ACTIONS.DELETE,
    entity: PRICING_ENTITIES.DURATION,
    entityId: id,
    before: {
      label: before.label, minDays: before.minDays, maxDays: before.maxDays,
      profitUsd: num(before.profitUsd), isActive: before.isActive,
    },
    after: null,
  })
  return before
}

/* ─── Override ──────────────────────────────────────────────────────────── */

export type UpsertOverrideInput = {
  planId: string
  fixedPriceUsd: number
  reason?: string | null
  isActive?: boolean
}

export async function upsertPlanOverride(
  input: UpsertOverrideInput,
  actor: ActorContext,
) {
  const before = await prisma.planPriceOverride.findUnique({
    where: { planId: input.planId },
  })

  const after = await prisma.planPriceOverride.upsert({
    where: { planId: input.planId },
    update: {
      fixedPriceUsd: input.fixedPriceUsd,
      reason: input.reason ?? before?.reason ?? null,
      isActive: input.isActive ?? before?.isActive ?? true,
    },
    create: {
      planId: input.planId,
      fixedPriceUsd: input.fixedPriceUsd,
      reason: input.reason ?? null,
      isActive: input.isActive ?? true,
    },
  })

  await refreshPlanCache([input.planId])
  await logPricingChange({
    ...actor,
    action: before ? PRICING_ACTIONS.UPDATE : PRICING_ACTIONS.CREATE,
    entity: PRICING_ENTITIES.OVERRIDE,
    entityId: after.id,
    before: before
      ? {
          planId: before.planId,
          fixedPriceUsd: num(before.fixedPriceUsd),
          isActive: before.isActive,
          reason: before.reason,
        }
      : null,
    after: {
      planId: after.planId,
      fixedPriceUsd: num(after.fixedPriceUsd),
      isActive: after.isActive,
      reason: after.reason,
    },
  })

  return after
}

export async function deletePlanOverride(id: string, actor: ActorContext) {
  const before = await prisma.planPriceOverride.findUnique({ where: { id } })
  if (!before) return null

  await prisma.planPriceOverride.delete({ where: { id } })
  await refreshPlanCache([before.planId])
  await logPricingChange({
    ...actor,
    action: PRICING_ACTIONS.DELETE,
    entity: PRICING_ENTITIES.OVERRIDE,
    entityId: id,
    before: {
      planId: before.planId,
      fixedPriceUsd: num(before.fixedPriceUsd),
      isActive: before.isActive,
      reason: before.reason,
    },
    after: null,
  })
  return before
}
