import bcrypt from 'bcryptjs'
import { prisma } from '../../client'
import type {
  ChangePasswordInput,
  DashboardSummaryDto,
  PreferencesDto,
  ProfileDto,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from './types'

/**
 * Account service.
 *
 * Every function takes a `userId` resolved from the session — callers are
 * responsible for authenticating first (via `requireAuth` in the route layer).
 * The service itself does NOT cross-check session ↔ id, so don't pass an id
 * that didn't come from a verified session.
 */

const PASSWORD_BCRYPT_COST = 12
const PASSWORD_MIN_LENGTH = 8

const DEFAULT_PREFS = {
  emailNotifications: true,
  orderUpdates: true,
  expiryReminders: true,
  marketingEmail: false,
  smsNotifications: false,
  preferredCurrency: null as string | null,
  preferredLanguage: null as string | null,
}

/* ─── Profile ───────────────────────────────────────────────────────────── */

export async function getProfile(userId: string): Promise<ProfileDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      countryCode: true,
      timezone: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    timezone: user.timezone,
    role: user.role,
    status: user.status,
    memberSince: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  }
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfileDto> {
  // Build the patch — only include explicitly-set keys so null clears, undefined ignores.
  const data: Record<string, string | null> = {}
  if ('name' in input) {
    const v = input.name?.trim() ?? null
    if (v !== null && (v.length < 1 || v.length > 100)) {
      throw new ValidationError('Name must be 1–100 characters')
    }
    data.name = v
  }
  if ('phone' in input) {
    const v = input.phone?.trim() ?? null
    if (v !== null && v.length > 30) throw new ValidationError('Phone too long')
    data.phone = v
  }
  if ('countryCode' in input) {
    const v = input.countryCode?.trim().toUpperCase() ?? null
    if (v !== null && !/^[A-Z]{2}$/.test(v)) {
      throw new ValidationError('countryCode must be ISO 3166-1 alpha-2')
    }
    data.countryCode = v
  }
  if ('timezone' in input) {
    const v = input.timezone?.trim() ?? null
    if (v !== null && v.length > 60) throw new ValidationError('Timezone string too long')
    data.timezone = v
  }

  await prisma.user.update({ where: { id: userId }, data })
  const profile = await getProfile(userId)
  if (!profile) throw new Error(`User ${userId} disappeared mid-update`)
  return profile
}

/* ─── Password ──────────────────────────────────────────────────────────── */

export class ValidationError extends Error {
  readonly code = 'VALIDATION' as const
}
export class WrongPasswordError extends Error {
  readonly code = 'WRONG_PASSWORD' as const
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  if (typeof input.newPassword !== 'string' || input.newPassword.length < PASSWORD_MIN_LENGTH) {
    throw new ValidationError(`New password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }
  if (input.newPassword === input.currentPassword) {
    throw new ValidationError('New password must differ from current password')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user) throw new ValidationError('User not found')

  // OAuth-only accounts have no password to verify against; require one to be set first.
  if (!user.passwordHash) {
    throw new ValidationError('This account has no password set — use the social login flow')
  }

  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash)
  if (!ok) throw new WrongPasswordError('Current password is incorrect')

  const newHash = await bcrypt.hash(input.newPassword, PASSWORD_BCRYPT_COST)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } })
}

/* ─── Preferences ───────────────────────────────────────────────────────── */

export async function getPreferences(userId: string): Promise<PreferencesDto> {
  let row = await prisma.userPreference.findUnique({ where: { userId } })
  if (!row) {
    // Lazy-create on first read so the storefront can render real defaults.
    row = await prisma.userPreference.create({ data: { userId, ...DEFAULT_PREFS } })
  }
  return {
    emailNotifications: row.emailNotifications,
    orderUpdates: row.orderUpdates,
    expiryReminders: row.expiryReminders,
    marketingEmail: row.marketingEmail,
    smsNotifications: row.smsNotifications,
    preferredCurrency: row.preferredCurrency,
    preferredLanguage: row.preferredLanguage,
  }
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<PreferencesDto> {
  const patch: Record<string, boolean | string | null> = {}
  for (const key of [
    'emailNotifications', 'orderUpdates', 'expiryReminders',
    'marketingEmail', 'smsNotifications',
  ] as const) {
    if (key in input && typeof input[key] === 'boolean') patch[key] = input[key] as boolean
  }
  if ('preferredCurrency' in input) {
    const v = input.preferredCurrency
    if (v === null) patch.preferredCurrency = null
    else if (typeof v === 'string') patch.preferredCurrency = v.toUpperCase().trim() || null
  }
  if ('preferredLanguage' in input) {
    const v = input.preferredLanguage
    if (v === null) patch.preferredLanguage = null
    else if (typeof v === 'string') patch.preferredLanguage = v.toLowerCase().trim() || null
  }

  await prisma.userPreference.upsert({
    where: { userId },
    update: patch,
    create: { userId, ...DEFAULT_PREFS, ...patch },
  })
  return getPreferences(userId)
}

/* ─── Dashboard summary ─────────────────────────────────────────────────── */

export async function getDashboardSummary(userId: string): Promise<DashboardSummaryDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  if (!user) return null

  // Sequential (pooler is bursty-sensitive).
  const totalOrders = await prisma.order.count({ where: { userId, deletedAt: null } })
  const activeEsims = await prisma.esim.count({
    where: { userId, status: { in: ['DELIVERED', 'PROVISIONED', 'ACTIVATED'] as never } },
  })
  const expiredEsims = await prisma.esim.count({ where: { userId, status: 'EXPIRED' as never } })
  const openTickets = await prisma.supportTicket.count({
    where: { userId, status: { in: ['OPEN', 'IN_PROGRESS'] as never } },
  })
  const dataAgg = await prisma.esim.aggregate({
    where: { userId },
    _sum: { dataUsedMb: true },
  })

  const recentOrders = await prisma.order.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, orderNumber: true, status: true, createdAt: true },
  })
  const recentTickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: { id: true, subject: true, status: true, updatedAt: true },
  })

  const recentActivity = [
    ...recentOrders.map((o) => ({
      kind: 'order' as const,
      id: o.id,
      title: o.orderNumber,
      subtitle: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    ...recentTickets.map((t) => ({
      kind: 'ticket' as const,
      id: t.id,
      title: t.subject,
      subtitle: t.status,
      createdAt: t.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5)

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      memberSince: user.createdAt.toISOString(),
    },
    stats: {
      totalOrders,
      activeEsims,
      expiredEsims,
      openTickets,
      totalDataUsedMb: dataAgg._sum.dataUsedMb ?? 0,
    },
    recentActivity,
  }
}

/* ─── Orders + eSIMs (read-only foundation, populated in Phase 4F/4H) ──── */

export type AccountOrderDto = {
  id: string
  orderNumber: string
  status: string
  currency: string
  usdTotal: number
  localTotal: number
  createdAt: string
  itemSummary: string
}

export async function listMyOrders(userId: string, limit = 50): Promise<AccountOrderDto[]> {
  const orders = await prisma.order.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, Math.max(1, limit)),
    select: {
      id: true,
      orderNumber: true,
      status: true,
      currency: true,
      usdTotal: true,
      localTotal: true,
      createdAt: true,
      items: { select: { planName: true, data: true, days: true } },
    },
  })
  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    currency: o.currency,
    usdTotal: Number(o.usdTotal),
    localTotal: Number(o.localTotal),
    createdAt: o.createdAt.toISOString(),
    itemSummary:
      o.items.length === 0
        ? '—'
        : o.items.length === 1
          ? `${o.items[0].planName} (${o.items[0].data} · ${o.items[0].days}d)`
          : `${o.items[0].planName} +${o.items.length - 1} more`,
  }))
}

export async function getMyOrder(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId, deletedAt: null },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export type AccountEsimDto = {
  id: string
  status: string
  iccid: string | null
  qrCodeUrl: string | null
  activationCode: string | null
  apn: string | null
  dataUsedMb: number
  dataTotalMb: number | null
  activatedAt: string | null
  expiresAt: string | null
  plan: {
    name: string
    data: string
    days: number
    country: string | null
    network: string | null
  } | null
}

export async function listMyEsims(userId: string): Promise<AccountEsimDto[]> {
  const esims = await prisma.esim.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItem: {
        select: { planName: true, data: true, days: true, country: true, network: true },
      },
    },
  })
  return esims.map((e) => ({
    id: e.id,
    status: e.status,
    iccid: e.iccid,
    qrCodeUrl: e.qrCodeUrl,
    activationCode: e.activationCode,
    apn: e.apn,
    dataUsedMb: e.dataUsedMb,
    dataTotalMb: e.dataTotalMb,
    activatedAt: e.activatedAt?.toISOString() ?? null,
    expiresAt: e.expiresAt?.toISOString() ?? null,
    plan: e.orderItem
      ? {
          name: e.orderItem.planName,
          data: e.orderItem.data,
          days: e.orderItem.days,
          country: e.orderItem.country,
          network: e.orderItem.network,
        }
      : null,
  }))
}
