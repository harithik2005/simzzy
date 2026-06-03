import { ProviderStatus } from '@prisma/client'
import { prisma } from '../../client'
import { listRates } from '../currency/service'
import { BASE_CURRENCY } from '../currency/types'

/**
 * System health checks.
 *
 * Each check is independent + non-throwing — a failed check produces a
 * `Critical` entry rather than blocking the entire response. The frontend
 * polls this endpoint; offline services show with a red dot but the dashboard
 * still loads.
 *
 * Severity levels (UI maps to colours):
 *   HEALTHY  → green
 *   WARNING  → yellow
 *   CRITICAL → red
 */

export type HealthSeverity = 'HEALTHY' | 'WARNING' | 'CRITICAL'

export type ServiceHealthDto = {
  id: string
  name: string
  category: 'core' | 'integration'
  status: HealthSeverity
  message: string
  /** Last check timestamp (ISO). */
  checkedAt: string
  /** Response time in ms, when measurable. */
  responseTimeMs: number | null
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: unknown; ms: number }> {
  const start = Date.now()
  try {
    const result = await fn()
    return { result, ms: Date.now() - start }
  } catch (error) {
    return { error, ms: Date.now() - start }
  }
}

async function checkDatabase(): Promise<ServiceHealthDto> {
  const t = await timed(() => prisma.$queryRaw<unknown[]>`SELECT 1 AS ok`)
  const now = new Date().toISOString()
  if (t.error) {
    return {
      id: 'db', name: 'Database', category: 'core', status: 'CRITICAL',
      message: `Postgres unreachable: ${(t.error as Error).message}`,
      checkedAt: now, responseTimeMs: t.ms,
    }
  }
  return {
    id: 'db', name: 'Database', category: 'core',
    status: t.ms > 2000 ? 'WARNING' : 'HEALTHY',
    message: t.ms > 2000 ? `Slow response (${t.ms} ms)` : 'Pooled connection healthy',
    checkedAt: now, responseTimeMs: t.ms,
  }
}

async function checkPrismaSchema(): Promise<ServiceHealthDto> {
  const t = await timed(async () => prisma.user.count({ take: 1 }))
  const now = new Date().toISOString()
  if (t.error) {
    return {
      id: 'orm', name: 'Backend APIs', category: 'core', status: 'CRITICAL',
      message: `Prisma client error: ${(t.error as Error).message}`,
      checkedAt: now, responseTimeMs: t.ms,
    }
  }
  return {
    id: 'orm', name: 'Backend APIs', category: 'core', status: 'HEALTHY',
    message: 'Prisma queries succeeding',
    checkedAt: now, responseTimeMs: t.ms,
  }
}

async function checkFrontend(): Promise<ServiceHealthDto> {
  // The frontend serving this very response is, definitionally, up.
  return {
    id: 'frontend', name: 'Frontend', category: 'core',
    status: 'HEALTHY', message: 'Next.js handler responded',
    checkedAt: new Date().toISOString(), responseTimeMs: null,
  }
}

async function checkCurrencyService(): Promise<ServiceHealthDto> {
  const t = await timed(() => listRates())
  const now = new Date().toISOString()
  if (t.error) {
    return {
      id: 'currency', name: 'Currency Service', category: 'integration', status: 'CRITICAL',
      message: `Rate cache unreadable: ${(t.error as Error).message}`,
      checkedAt: now, responseTimeMs: t.ms,
    }
  }
  // If no rate row newer than 6 hours we mark WARNING — the storefront would
  // fall back to USD silently otherwise.
  const rates = t.result ?? []
  const stale = rates.find((r) => r.quote !== BASE_CURRENCY && Date.now() - new Date(r.fetchedAt).getTime() > 6 * 60 * 60 * 1000)
  return {
    id: 'currency', name: 'Currency Service', category: 'integration',
    status: stale ? 'WARNING' : 'HEALTHY',
    message: stale ? `Stale rates (${stale.quote} > 6h)` : `${rates.length} rates cached`,
    checkedAt: now, responseTimeMs: t.ms,
  }
}

async function checkEsimProviders(): Promise<ServiceHealthDto> {
  const t = await timed(async () => {
    const active = await prisma.esimProvider.count({ where: { status: ProviderStatus.ACTIVE, deletedAt: null } })
    const total = await prisma.esimProvider.count({ where: { deletedAt: null } })
    return { active, total }
  })
  const now = new Date().toISOString()
  if (t.error) {
    return {
      id: 'esim-provider', name: 'eSIM Provider', category: 'integration', status: 'CRITICAL',
      message: (t.error as Error).message,
      checkedAt: now, responseTimeMs: t.ms,
    }
  }
  const { active, total } = t.result!
  if (active === 0) {
    return {
      id: 'esim-provider', name: 'eSIM Provider', category: 'integration', status: 'CRITICAL',
      message: `No active eSIM provider (${total} configured)`,
      checkedAt: now, responseTimeMs: t.ms,
    }
  }
  return {
    id: 'esim-provider', name: 'eSIM Provider', category: 'integration', status: 'HEALTHY',
    message: `${active}/${total} active`,
    checkedAt: now, responseTimeMs: t.ms,
  }
}

async function checkPaymentProviders(): Promise<ServiceHealthDto> {
  const t = await timed(async () => {
    const active = await prisma.paymentProvider.count({ where: { status: ProviderStatus.ACTIVE } })
    const defaultPv = await prisma.paymentProvider.findFirst({ where: { isDefault: true }, select: { slug: true, status: true } })
    return { active, defaultPv }
  })
  const now = new Date().toISOString()
  if (t.error) {
    return {
      id: 'payment', name: 'Payment Service', category: 'integration', status: 'CRITICAL',
      message: (t.error as Error).message, checkedAt: now, responseTimeMs: t.ms,
    }
  }
  const { active, defaultPv } = t.result!
  if (!defaultPv) {
    return {
      id: 'payment', name: 'Payment Service', category: 'integration', status: 'CRITICAL',
      message: 'No default payment provider', checkedAt: now, responseTimeMs: t.ms,
    }
  }
  if (defaultPv.status !== ProviderStatus.ACTIVE) {
    return {
      id: 'payment', name: 'Payment Service', category: 'integration', status: 'WARNING',
      message: `Default provider ${defaultPv.slug} is ${defaultPv.status}`,
      checkedAt: now, responseTimeMs: t.ms,
    }
  }
  return {
    id: 'payment', name: 'Payment Service', category: 'integration', status: 'HEALTHY',
    message: `${active} active, default: ${defaultPv.slug}`,
    checkedAt: now, responseTimeMs: t.ms,
  }
}

async function checkEmailService(): Promise<ServiceHealthDto> {
  // Email integration lands in a later phase. Surface WARNING with a clear
  // explanation rather than CRITICAL so the storefront doesn't look broken.
  return {
    id: 'email', name: 'Email Service', category: 'integration',
    status: 'WARNING',
    message: 'Email provider not configured (Phase 4I)',
    checkedAt: new Date().toISOString(), responseTimeMs: null,
  }
}

export type SystemHealthReport = {
  status: HealthSeverity
  services: ServiceHealthDto[]
  generatedAt: string
}

export async function runHealthChecks(): Promise<SystemHealthReport> {
  // Sequential — pooler-friendly. All checks are sub-second on a healthy DB.
  const services = [
    await checkDatabase(),
    await checkPrismaSchema(),
    await checkFrontend(),
    await checkCurrencyService(),
    await checkEsimProviders(),
    await checkPaymentProviders(),
    await checkEmailService(),
  ]

  const aggregate: HealthSeverity = services.some((s) => s.status === 'CRITICAL')
    ? 'CRITICAL'
    : services.some((s) => s.status === 'WARNING')
      ? 'WARNING'
      : 'HEALTHY'

  return { status: aggregate, services, generatedAt: new Date().toISOString() }
}
