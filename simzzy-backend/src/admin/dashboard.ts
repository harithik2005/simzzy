import { OrderStatus, ProviderStatus, TicketStatus, UserStatus } from '@prisma/client'
import { prisma } from '../../client'

/**
 * Admin overview — every number on the admin home page.
 *
 * One sequential pass over the DB (the Supabase pooler is bursty-sensitive in
 * dev, and the user already chose this trade-off elsewhere). Each count is
 * cheap (indexed columns) so total latency stays under 500 ms even at 100k
 * orders.
 */

export type DashboardSummary = {
  users: {
    total: number
    active: number
    suspended: number
    newLast7Days: number
  }
  orders: {
    total: number
    pending: number       // PENDING + PAYMENT_PROCESSING
    inProgress: number    // PAYMENT_SUCCESS + ORDER_SUBMITTED + QR_PENDING + QR_RECEIVED
    completed: number     // DELIVERED + ACTIVATED
    failed: number        // FAILED
    cancelled: number     // CANCELLED
    refunded: number      // REFUNDED
    last7Days: number
  }
  revenue: {
    totalUsd: number      // lifetime captured revenue (delivered/activated orders)
    last30dUsd: number
    last7dUsd: number
  }
  plans: {
    active: number
    total: number
  }
  tickets: {
    open: number
    inProgress: number
    resolved: number
    closed: number
  }
  providers: {
    esimActive: number
    paymentActive: number
  }
}

const NOW = () => new Date()
const daysAgo = (n: number) => {
  const d = NOW()
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const cutoff7  = daysAgo(7)
  const cutoff30 = daysAgo(30)

  // Users
  const totalUsers = await prisma.user.count({ where: { deletedAt: null } })
  const activeUsers = await prisma.user.count({ where: { status: UserStatus.ACTIVE, deletedAt: null } })
  const suspendedUsers = await prisma.user.count({ where: { status: UserStatus.SUSPENDED, deletedAt: null } })
  const newUsers7 = await prisma.user.count({ where: { deletedAt: null, createdAt: { gte: cutoff7 } } })

  // Orders
  const totalOrders = await prisma.order.count({ where: { deletedAt: null } })
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { _all: true },
  })
  const countByStatus = new Map(ordersByStatus.map((r) => [r.status, r._count._all]))
  const sum = (...statuses: OrderStatus[]) => statuses.reduce((s, k) => s + (countByStatus.get(k) ?? 0), 0)

  const orders7 = await prisma.order.count({ where: { deletedAt: null, createdAt: { gte: cutoff7 } } })

  // Revenue — only count captured + fulfilled (DELIVERED/ACTIVATED).
  const completedFilter = { status: { in: [OrderStatus.DELIVERED, OrderStatus.ACTIVATED] }, deletedAt: null }
  const totalRev = await prisma.order.aggregate({ where: completedFilter, _sum: { usdTotal: true } })
  const rev30 = await prisma.order.aggregate({
    where: { ...completedFilter, createdAt: { gte: cutoff30 } },
    _sum: { usdTotal: true },
  })
  const rev7 = await prisma.order.aggregate({
    where: { ...completedFilter, createdAt: { gte: cutoff7 } },
    _sum: { usdTotal: true },
  })

  // Plans
  const totalPlans = await prisma.plan.count({ where: { deletedAt: null } })
  const activePlans = await prisma.plan.count({ where: { deletedAt: null, isActive: true } })

  // Tickets
  const ticketsByStatus = await prisma.supportTicket.groupBy({
    by: ['status'],
    _count: { _all: true },
  })
  const tCount = new Map(ticketsByStatus.map((r) => [r.status, r._count._all]))

  // Providers
  const esimActive = await prisma.esimProvider.count({ where: { status: ProviderStatus.ACTIVE, deletedAt: null } })
  const paymentActive = await prisma.paymentProvider.count({ where: { status: ProviderStatus.ACTIVE } })

  return {
    users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, newLast7Days: newUsers7 },
    orders: {
      total: totalOrders,
      pending:    sum(OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING),
      inProgress: sum(OrderStatus.PAYMENT_SUCCESS, OrderStatus.ORDER_SUBMITTED, OrderStatus.QR_PENDING, OrderStatus.QR_RECEIVED),
      completed:  sum(OrderStatus.DELIVERED, OrderStatus.ACTIVATED),
      failed:     sum(OrderStatus.FAILED),
      cancelled:  sum(OrderStatus.CANCELLED),
      refunded:   sum(OrderStatus.REFUNDED),
      last7Days:  orders7,
    },
    revenue: {
      totalUsd:   Number(totalRev._sum.usdTotal ?? 0),
      last30dUsd: Number(rev30._sum.usdTotal ?? 0),
      last7dUsd:  Number(rev7._sum.usdTotal ?? 0),
    },
    plans: { active: activePlans, total: totalPlans },
    tickets: {
      open:       tCount.get(TicketStatus.OPEN) ?? 0,
      inProgress: tCount.get(TicketStatus.IN_PROGRESS) ?? 0,
      resolved:   tCount.get(TicketStatus.RESOLVED) ?? 0,
      closed:     tCount.get(TicketStatus.CLOSED) ?? 0,
    },
    providers: { esimActive, paymentActive },
  }
}
