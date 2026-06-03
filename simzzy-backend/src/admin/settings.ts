import { Prisma, Role, SettingType } from '@prisma/client'
import { prisma } from '../../client'
import { AdminActorContext, AdminError, writeAudit } from './_shared'

/**
 * Site settings management.
 *
 * Settings live in the `site_settings` key-value table. This module is driven
 * by an explicit **registry** (`SETTINGS_REGISTRY`) — only keys listed here can
 * be read or written through the admin surface, so a typo or a hostile client
 * can never create arbitrary config rows.
 *
 * RBAC: a setting flagged `superAdminOnly` (maintenance mode, provider sandbox
 * mode — the "production toggles") may only be changed by a SUPER_ADMIN. ADMINs
 * may change everything else. This is enforced server-side in `updateSettings`,
 * never trusting the caller.
 *
 * Note: the global profit *amount* is NOT here — it is the single source of
 * truth in `pricing_global_rules`. `show_profit_display` only toggles whether
 * profit/margin columns are surfaced in the admin UI.
 */

export type SettingDef = {
  key: string
  type: SettingType
  group: string
  label: string
  description: string
  isPublic: boolean
  superAdminOnly: boolean
  default: string | number | boolean
}

export const SETTINGS_REGISTRY: SettingDef[] = [
  { key: 'site_name', type: SettingType.STRING, group: 'general', label: 'Site name', description: 'Public site name', isPublic: true, superAdminOnly: false, default: 'Simzzy' },
  { key: 'support_email', type: SettingType.STRING, group: 'general', label: 'Support email', description: 'Address shown to customers for help', isPublic: true, superAdminOnly: false, default: 'support@simzzy.com' },
  { key: 'default_currency', type: SettingType.STRING, group: 'general', label: 'Default currency', description: 'Fallback display currency when none is detected', isPublic: true, superAdminOnly: false, default: 'USD' },
  { key: 'chatbot_enabled', type: SettingType.BOOLEAN, group: 'features', label: 'Chatbot enabled', description: 'Toggles the support chat widget on the storefront', isPublic: true, superAdminOnly: false, default: true },
  { key: 'show_profit_display', type: SettingType.BOOLEAN, group: 'features', label: 'Show profit / margin', description: 'Surface cost, profit and margin columns across the admin panel', isPublic: false, superAdminOnly: false, default: true },
  { key: 'maintenance_mode', type: SettingType.BOOLEAN, group: 'general', label: 'Maintenance mode', description: 'When on, the storefront shows a maintenance page (production toggle)', isPublic: true, superAdminOnly: true, default: false },
  { key: 'provider_sandbox_mode', type: SettingType.BOOLEAN, group: 'integration', label: 'Provider sandbox mode', description: 'Route eSIM/payment providers to sandbox endpoints (production toggle)', isPublic: false, superAdminOnly: true, default: true },
]

const REGISTRY_BY_KEY = new Map(SETTINGS_REGISTRY.map((s) => [s.key, s]))

export type SettingDto = {
  key: string
  value: string | number | boolean
  type: SettingType
  group: string
  label: string
  description: string
  superAdminOnly: boolean
}

export type SettingsActor = AdminActorContext & { role: Role }

function coerce(def: SettingDef, raw: Prisma.JsonValue | undefined): string | number | boolean {
  if (raw === undefined || raw === null) return def.default
  switch (def.type) {
    case SettingType.BOOLEAN:
      return typeof raw === 'boolean' ? raw : def.default
    case SettingType.NUMBER:
      return typeof raw === 'number' ? raw : def.default
    default:
      return typeof raw === 'string' ? raw : def.default
  }
}

/** Read every registered setting, falling back to the registry default when a row is absent. */
export async function getSettings(): Promise<SettingDto[]> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: SETTINGS_REGISTRY.map((s) => s.key) } },
    select: { key: true, value: true },
  })
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  return SETTINGS_REGISTRY.map((def) => ({
    key: def.key,
    value: coerce(def, byKey.get(def.key)),
    type: def.type,
    group: def.group,
    label: def.label,
    description: def.description,
    superAdminOnly: def.superAdminOnly,
  }))
}

/** Public subset (isPublic = true) — for the storefront. Returns a flat key→value map. */
export async function getPublicSettings(): Promise<Record<string, string | number | boolean>> {
  const publicDefs = SETTINGS_REGISTRY.filter((s) => s.isPublic)
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: publicDefs.map((s) => s.key) } },
    select: { key: true, value: true },
  })
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const out: Record<string, string | number | boolean> = {}
  for (const def of publicDefs) out[def.key] = coerce(def, byKey.get(def.key))
  return out
}

function validateValue(def: SettingDef, value: unknown): string | number | boolean {
  switch (def.type) {
    case SettingType.BOOLEAN:
      if (typeof value !== 'boolean') throw new AdminError(`${def.label} must be a boolean`)
      return value
    case SettingType.NUMBER:
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new AdminError(`${def.label} must be a number`)
      return value
    default:
      if (typeof value !== 'string' || !value.trim()) throw new AdminError(`${def.label} must be a non-empty string`)
      return value.trim()
  }
}

/**
 * Apply a partial map of settings updates. Validates each key against the
 * registry (unknown keys rejected), enforces per-key SUPER_ADMIN gating, runs
 * all upserts in one transaction, and writes a single audit row.
 */
export async function updateSettings(
  updates: Record<string, unknown>,
  actor: SettingsActor,
): Promise<SettingDto[]> {
  const entries = Object.entries(updates ?? {})
  if (entries.length === 0) throw new AdminError('No settings provided')

  // Validate everything up-front so a bad/forbidden key aborts before any write.
  const prepared: Array<{ def: SettingDef; value: string | number | boolean }> = []
  for (const [key, value] of entries) {
    const def = REGISTRY_BY_KEY.get(key)
    if (!def) throw new AdminError(`Unknown setting: ${key}`)
    if (def.superAdminOnly && actor.role !== Role.SUPER_ADMIN) {
      throw new AdminError(`Only a SUPER_ADMIN can change "${def.label}"`, 403)
    }
    prepared.push({ def, value: validateValue(def, value) })
  }

  // Default currency must reference a configured, active currency.
  const currencyChange = prepared.find((p) => p.def.key === 'default_currency')
  if (currencyChange) {
    const exists = await prisma.currency.findFirst({
      where: { code: currencyChange.value as string, isActive: true },
      select: { code: true },
    })
    if (!exists) throw new AdminError(`Unknown or inactive currency: ${currencyChange.value}`)
  }

  const before = await getSettings()
  const beforeByKey = new Map(before.map((s) => [s.key, s.value]))

  await prisma.$transaction(
    prepared.map(({ def, value }) =>
      prisma.siteSetting.upsert({
        where: { key: def.key },
        update: { value: value as Prisma.InputJsonValue, updatedById: actor.actorId },
        create: {
          key: def.key,
          value: value as Prisma.InputJsonValue,
          type: def.type,
          group: def.group,
          isPublic: def.isPublic,
          description: def.description,
          updatedById: actor.actorId,
        },
      }),
    ),
  )

  await writeAudit({
    actor,
    action: 'update',
    entity: 'SiteSetting',
    entityId: null,
    before: Object.fromEntries(prepared.map((p) => [p.def.key, beforeByKey.get(p.def.key) ?? null])),
    after: Object.fromEntries(prepared.map((p) => [p.def.key, p.value])),
  })

  return getSettings()
}
