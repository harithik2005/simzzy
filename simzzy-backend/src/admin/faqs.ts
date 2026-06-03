import { Prisma } from '@prisma/client'
import { prisma } from '../../client'
import { AdminActorContext, AdminError, writeAudit } from './_shared'

/**
 * FAQ management (admin CMS).
 *
 * Backs the public Help Center content. Admins can create / edit / delete
 * (soft-delete via `deletedAt`), toggle published state, and reorder entries.
 * `sortOrder` drives the public ordering within a category.
 */

export type AdminFaqDto = {
  id: string
  category: string
  question: string
  answer: string
  isPublished: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type FaqFilters = {
  q?: string
  category?: string
  published?: boolean
}

export type FaqInput = {
  category: string
  question: string
  answer: string
  isPublished?: boolean
}

function rowToDto(f: {
  id: string; category: string; question: string; answer: string
  isPublished: boolean; sortOrder: number; createdAt: Date; updatedAt: Date
}): AdminFaqDto {
  return {
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
    isPublished: f.isPublished,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }
}

export async function listFaqs(filters: FaqFilters = {}): Promise<AdminFaqDto[]> {
  const where: Prisma.FaqWhereInput = { deletedAt: null }
  const ands: Prisma.FaqWhereInput[] = []
  if (filters.category) ands.push({ category: filters.category })
  if (typeof filters.published === 'boolean') ands.push({ isPublished: filters.published })
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim()
    ands.push({
      OR: [
        { question: { contains: q, mode: 'insensitive' } },
        { answer: { contains: q, mode: 'insensitive' } },
      ],
    })
  }
  if (ands.length) where.AND = ands

  const rows = await prisma.faq.findMany({
    where,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(rowToDto)
}

/** Distinct categories present (for the filter dropdown / form suggestions). */
export async function listFaqCategories(): Promise<string[]> {
  const rows = await prisma.faq.groupBy({
    by: ['category'],
    where: { deletedAt: null },
    orderBy: { category: 'asc' },
  })
  return rows.map((r) => r.category)
}

function validateInput(input: FaqInput): FaqInput {
  const category = input.category?.trim()
  const question = input.question?.trim()
  const answer = input.answer?.trim()
  if (!category) throw new AdminError('Category is required')
  if (!question) throw new AdminError('Question is required')
  if (!answer) throw new AdminError('Answer is required')
  return { category, question, answer, isPublished: input.isPublished }
}

export async function createFaq(input: FaqInput, actor: AdminActorContext): Promise<AdminFaqDto> {
  const clean = validateInput(input)
  // New entries go to the end of their category.
  const last = await prisma.faq.findFirst({
    where: { category: clean.category, deletedAt: null },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  const created = await prisma.faq.create({
    data: {
      category: clean.category,
      question: clean.question,
      answer: clean.answer,
      isPublished: clean.isPublished ?? true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })
  await writeAudit({
    actor, action: 'create', entity: 'Faq', entityId: created.id,
    before: null,
    after: { category: created.category, question: created.question, isPublished: created.isPublished },
  })
  return rowToDto(created)
}

export async function updateFaq(id: string, input: FaqInput, actor: AdminActorContext): Promise<AdminFaqDto> {
  const clean = validateInput(input)
  const before = await prisma.faq.findFirst({ where: { id, deletedAt: null } })
  if (!before) throw new AdminError('FAQ not found', 404)
  const updated = await prisma.faq.update({
    where: { id },
    data: {
      category: clean.category,
      question: clean.question,
      answer: clean.answer,
      ...(typeof clean.isPublished === 'boolean' ? { isPublished: clean.isPublished } : {}),
    },
  })
  await writeAudit({
    actor, action: 'update', entity: 'Faq', entityId: id,
    before: { category: before.category, question: before.question, answer: before.answer, isPublished: before.isPublished },
    after: { category: updated.category, question: updated.question, answer: updated.answer, isPublished: updated.isPublished },
  })
  return rowToDto(updated)
}

export async function setFaqPublished(id: string, isPublished: boolean, actor: AdminActorContext): Promise<AdminFaqDto> {
  const before = await prisma.faq.findFirst({ where: { id, deletedAt: null }, select: { isPublished: true } })
  if (!before) throw new AdminError('FAQ not found', 404)
  const updated = await prisma.faq.update({ where: { id }, data: { isPublished } })
  await writeAudit({
    actor, action: isPublished ? 'publish' : 'unpublish', entity: 'Faq', entityId: id,
    before: { isPublished: before.isPublished }, after: { isPublished },
  })
  return rowToDto(updated)
}

export async function deleteFaq(id: string, actor: AdminActorContext): Promise<void> {
  const before = await prisma.faq.findFirst({ where: { id, deletedAt: null }, select: { id: true, question: true } })
  if (!before) throw new AdminError('FAQ not found', 404)
  await prisma.faq.update({ where: { id }, data: { deletedAt: new Date() } })
  await writeAudit({
    actor, action: 'delete', entity: 'Faq', entityId: id,
    before: { question: before.question }, after: null,
  })
}

/**
 * Reorder FAQs by assigning `sortOrder = index` for the given id list, scoped to
 * a single category. Runs in a transaction so the ordering is never half-applied.
 */
export async function reorderFaqs(category: string, orderedIds: string[], actor: AdminActorContext): Promise<AdminFaqDto[]> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new AdminError('orderedIds must be a non-empty array')
  }
  const existing = await prisma.faq.findMany({
    where: { id: { in: orderedIds }, category, deletedAt: null },
    select: { id: true },
  })
  if (existing.length !== orderedIds.length) {
    throw new AdminError('orderedIds contains unknown or mismatched FAQ ids', 409)
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.faq.update({ where: { id }, data: { sortOrder: index } })),
  )
  await writeAudit({
    actor, action: 'reorder', entity: 'Faq', entityId: null,
    before: null, after: { category, orderedIds },
  })
  return listFaqs({ category })
}
