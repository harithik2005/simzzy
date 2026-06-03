/**
 * Simzzy backend — admin module barrel.
 * Operations services consumed by the Admin Operations Center (Phase 4G).
 */
export { getDashboardSummary } from './dashboard'
export type { DashboardSummary } from './dashboard'

export {
  listUsers,
  getUserDetail,
  setUserStatus,
  setUserRole,
  ForbiddenError,
} from './users'
export type {
  AdminUserListItem,
  AdminUserDetail,
  ListUsersFilters,
  ActorContext as AdminUserActor,
} from './users'

export {
  listEsimProviders,
  listPaymentProviders,
  setEsimProviderStatus,
  setPaymentProviderStatus,
} from './providers'
export type {
  EsimProviderDto,
  PaymentProviderDto,
  ActorContext as AdminProviderActor,
} from './providers'

export {
  listAuditLog,
  listAuditEntities,
} from './audit'
export type { AuditLogEntryDto, AuditFilters } from './audit'

export {
  listAdminTickets,
  getAdminTicket,
  adminReplyToTicket,
  setTicketStatus,
} from './tickets'
export type {
  AdminTicketSummary,
  AdminTicketDetail,
  TicketFilters,
  AdminActor,
} from './tickets'

export { runHealthChecks } from './health'
export type {
  ServiceHealthDto,
  SystemHealthReport,
  HealthSeverity,
} from './health'

export { AdminError } from './_shared'
export type { AdminActorContext } from './_shared'

export {
  listFaqs,
  listFaqCategories,
  createFaq,
  updateFaq,
  setFaqPublished,
  deleteFaq,
  reorderFaqs,
} from './faqs'
export type { AdminFaqDto, FaqFilters, FaqInput } from './faqs'

export {
  listReviews,
  getReviewStats,
  setReviewStatus,
  setReviewHidden,
  deleteReview,
} from './reviews'
export type {
  AdminReviewDto,
  AdminReviewStatusFilter,
  ReviewFilters,
  ReviewStatsDto,
} from './reviews'

export {
  listPayments,
  getPaymentDetail,
  getPaymentStats,
} from './payments'
export type {
  AdminPaymentDto,
  AdminPaymentDetailDto,
  AdminPaymentEventDto,
  PaymentFilters,
  PaymentStatsDto,
} from './payments'

export {
  listAdminPlans,
  getPlanFilterOptions,
  setPlanActive,
  prepareProviderSync,
} from './plans'
export type {
  AdminPlanDto,
  PlanFilters,
  PlanFilterOptions,
  SyncPreparationDto,
} from './plans'

export {
  SETTINGS_REGISTRY,
  getSettings,
  getPublicSettings,
  updateSettings,
} from './settings'
export type { SettingDto, SettingDef, SettingsActor } from './settings'
