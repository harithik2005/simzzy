import { Prisma, ReviewStatus } from '@prisma/client'
import { prisma } from '../../client'
import { AdminActorContext, AdminError, writeAudit } from './_shared'

/**
 * Review moderation.
 *
 * The `ReviewStatus` enum models the moderation decision (PENDING → APPROVED /
 * REJECTED). "Hide" is a separate, reversible action mapped onto `deletedAt`
 * (soft-hide): a hidden review keeps its moderation status but disappears from
 * the storefront and can be restored. "Delete" is a hard delete.
 *
 *   approve → status APPROVED, visible
 *   reject  → status REJECTED, kept (author-visible, not on storefront)
 *   hide    → deletedAt set (reversible)
 *   unhide  → deletedAt cleared
 *   delete  → row removed permanently
 */

export type AdminReviewStatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN' | 'all'

export type AdminReviewDto = {
  id: string
  authorName: string
  country: string | null
  flag: string | null
  rating: number
  text: string
  status: ReviewStatus
  hidden: boolean
  planName: string | null
  createdAt: string
}

export type ReviewFilters = {
  q?: string
  status?: AdminReviewStatusFilter
}

export type ReviewStatsDto = {
  total: number
  approved: number
  pending: number
  rejected: number
  hidden: number
  avgRating: number
}

function rowToDto(r: {
  id: string; authorName: string; country: string | null; flag: string | null
  rating: number; text: string; status: ReviewStatus; deletedAt: Date | null
  createdAt: Date; plan: { name: string } | null
}): AdminReviewDto {
  return {
    id: r.id,
    authorName: r.authorName,
    country: r.country,
    flag: r.flag,
    rating: r.rating,
    text: r.text,
    status: r.status,
    hidden: r.deletedAt !== null,
    planName: r.plan?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function listReviews(filters: ReviewFilters = {}): Promise<AdminReviewDto[]> {
  const where: Prisma.ReviewWhereInput = {}
  const ands: Prisma.ReviewWhereInput[] = []

  if (filters.status === 'HIDDEN') {
    ands.push({ deletedAt: { not: null } })
  } else {
    ands.push({ deletedAt: null })
    if (filters.status && filters.status !== 'all') {
      ands.push({ status: filters.status })
    }
  }
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { authorName: { contains: q, mode: 'insensitive' } },
        { text: { contains: q, mode: 'insensitive' } },
        { plan: { is: { name: { contains: q, mode: 'insensitive' } } } },
      ],
    })
  }
  where.AND = ands

  const rows = await prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true, authorName: true, country: true, flag: true, rating: true,
      text: true, status: true, deletedAt: true, createdAt: true,
      plan: { select: { name: true } },
    },
  })
  return rows.map(rowToDto)
}

export async function getReviewStats(): Promise<ReviewStatsDto> {
  const [total, approved, pending, rejected, hidden, agg] = await Promise.all([
    prisma.review.count({ where: { deletedAt: null } }),
    prisma.review.count({ where: { deletedAt: null, status: ReviewStatus.APPROVED } }),
    prisma.review.count({ where: { deletedAt: null, status: ReviewStatus.PENDING } }),
    prisma.review.count({ where: { deletedAt: null, status: ReviewStatus.REJECTED } }),
    prisma.review.count({ where: { deletedAt: { not: null } } }),
    prisma.review.aggregate({ where: { deletedAt: null, status: ReviewStatus.APPROVED }, _avg: { rating: true } }),
  ])
  return {
    total, approved, pending, rejected, hidden,
    avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
  }
}

async function findReviewOr404(id: string) {
  const r = await prisma.review.findUnique({ where: { id }, select: { id: true, status: true, deletedAt: true } })
  if (!r) throw new AdminError('Review not found', 404)
  return r
}

export async function setReviewStatus(id: string, status: ReviewStatus, actor: AdminActorContext): Promise<AdminReviewDto> {
  const before = await findReviewOr404(id)
  // Approving/rejecting also un-hides — a moderation decision implies visibility intent.
  await prisma.review.update({ where: { id }, data: { status, deletedAt: null } })
  await writeAudit({
    actor, action: status === ReviewStatus.APPROVED ? 'approve' : status === ReviewStatus.REJECTED ? 'reject' : 'update',
    entity: 'Review', entityId: id,
    before: { status: before.status, hidden: before.deletedAt !== null },
    after: { status, hidden: false },
  })
  return loadDto(id)
}

export async function setReviewHidden(id: string, hidden: boolean, actor: AdminActorContext): Promise<AdminReviewDto> {
  const before = await findReviewOr404(id)
  await prisma.review.update({ where: { id }, data: { deletedAt: hidden ? new Date() : null } })
  await writeAudit({
    actor, action: hidden ? 'hide' : 'unhide', entity: 'Review', entityId: id,
    before: { hidden: before.deletedAt !== null }, after: { hidden },
  })
  return loadDto(id)
}

export async function deleteReview(id: string, actor: AdminActorContext): Promise<void> {
  const before = await prisma.review.findUnique({ where: { id }, select: { id: true, authorName: true, rating: true } })
  if (!before) throw new AdminError('Review not found', 404)
  await prisma.review.delete({ where: { id } })
  await writeAudit({
    actor, action: 'delete', entity: 'Review', entityId: id,
    before: { authorName: before.authorName, rating: before.rating }, after: null,
  })
}

async function loadDto(id: string): Promise<AdminReviewDto> {
  const r = await prisma.review.findUnique({
    where: { id },
    select: {
      id: true, authorName: true, country: true, flag: true, rating: true,
      text: true, status: true, deletedAt: true, createdAt: true,
      plan: { select: { name: true } },
    },
  })
  if (!r) throw new AdminError('Review not found', 404)
  return rowToDto(r)
}
