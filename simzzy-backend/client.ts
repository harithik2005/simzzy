/**
 * Shared Prisma client for the Simzzy monorepo.
 *
 * Consumers (e.g. the Next.js app) import `{ prisma }` plus any generated
 * enums/types from this package — so all Prisma lives in simzzy-backend and nothing
 * else needs the schema. A global singleton avoids exhausting connections
 * during Next.js dev hot-reloads.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Runtime value re-exports — listed explicitly (not `export *`) because the
// generated client is CommonJS and Turbopack warns on `export *` from CJS.
export {
  Prisma,
  PrismaClient,
  Role,
  UserStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ProviderStatus,
  TicketStatus,
  TicketPriority,
  ReviewStatus,
  HealthStatus,
  DeviceOS,
  DiscountType,
  AppliedRuleType,
  EsimStatus,
  ProviderOrderStatus,
  SyncStatus,
  ActorType,
  EmailStatus,
  SettingType,
} from '@prisma/client'

// All generated model/input types (type-only — erased at build, no runtime cost).
export type * from '@prisma/client'

/* ─── Catalog surface (countries / regions / plans) ──────────────────────── */

export {
  listPlans,
  searchPlans,
  getPlanBySlug,
  getFeaturedPlans,
  importMockPlans,
  mockPlans,
} from './src/plans'
export type {
  MockPlan,
  PlanSort,
  PlanListFilters,
  PlanListParams,
  PlanListItem,
  PlanListResult,
  PlanDetailDto,
  ImportSummary,
} from './src/plans'

export {
  countries as countryReferenceData,
  findCountryByName,
  listCountries,
  getCountryByCode,
  listRegions,
} from './src/common'
export type {
  CountryRef,
  CountryListItem,
  CountryListFilters,
  RegionListItem,
} from './src/common'

/* ─── Catalog (Phase 4G.5 — Browse / daily-plan query layer) ─────────────── */

export {
  listDestinations,
  getDestination,
  getRegularPlans,
  getDailyPlans,
  selectDailyPlan,
  getCoverage,
  getCoverageMap,
  resolveSlug,
  invalidateCatalogCache,
  slugify as catalogSlugify,
  classifyData,
  DAILY_TIERS,
} from './src/catalog'
export type {
  DestinationSummary,
  PlanCardDto,
  CoverageDto,
  CoverageCountryDto,
  CoverageMap,
  DailyPlansResult,
  DataTier,
  DataClassification,
} from './src/catalog'

/* ─── Pricing engine (rules, resolver, cache, audit) ─────────────────────── */

export {
  // read
  getPriceBreakdown,
  getResolvedPrice,
  getResolvedProfit,
  getAppliedRule,
  calculateSellingPrice,
  loadActiveRules,
  resolveOne,
  getRuleSet,
  deriveStats,
  // cache
  refreshPlanCache,
  refreshAllCaches,
  refreshCachesForCountry,
  refreshCachesForDuration,
  // write
  updateGlobalRule,
  upsertCountryRule,
  deleteCountryRule,
  createDurationRule,
  updateDurationRule,
  deleteDurationRule,
  upsertPlanOverride,
  deletePlanOverride,
  // audit
  logPricingChange,
  listPricingAuditLog,
  PRICING_ENTITIES,
  PRICING_ACTIONS,
} from './src/pricing'
export type {
  ActiveRulesSnapshot,
  ActorContext,
  GlobalRuleDto,
  CountryRuleDto,
  DurationRuleDto,
  OverrideRuleDto,
  PricingRuleSetDto,
  PricingStatsDto,
  ResolveInput,
  AppliedRuleSummary,
  PriceBreakdown,
  PricingAuditEntry,
  PricingEntity,
  PricingAction,
  UpdateGlobalInput,
  UpsertCountryInput,
  CreateDurationInput,
  UpdateDurationInput,
  UpsertOverrideInput,
} from './src/pricing'

/* ─── Currency (rates + visitor detection) ───────────────────────────────── */

export {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  currencySymbol,
  refreshRatesFromUpstream,
  getRate,
  listRates,
  getVisitorPricing,
} from './src/currency'
export type {
  SupportedCurrencyCode,
  RateDto,
  VisitorPricing,
} from './src/currency'

/* ─── Account (profile, password, preferences, dashboard, orders, eSIMs) ─ */

export {
  getProfile,
  updateProfile,
  changePassword,
  getPreferences,
  updatePreferences,
  getDashboardSummary,
  listMyOrders,
  getMyOrder,
  listMyEsims,
  ValidationError,
  WrongPasswordError,
} from './src/account'
export type {
  ProfileDto,
  PreferencesDto,
  DashboardSummaryDto,
  UpdateProfileInput,
  UpdatePreferencesInput,
  ChangePasswordInput,
  AccountOrderDto,
  AccountEsimDto,
} from './src/account'

/* ─── Support (customer-facing tickets) ──────────────────────────────────── */

export {
  TICKET_CATEGORIES,
  createTicket,
  listMyTickets,
  getMyTicket,
  addMyTicketMessage,
} from './src/support'
export type {
  TicketCategory,
  TicketSummaryDto,
  TicketMessageDto,
  TicketDetailDto,
  CreateTicketInput,
} from './src/support'

/* ─── Orders (lifecycle, state machine, audit) ───────────────────────────── */

export {
  createOrder,
  getOrderDetail,
  getMyOrder as getMyOrderDetail,
  listOrders,
  transitionStatus,
  cancelOrder,
  addOrderEvent,
  addOrderInternalNote,
  retryOrder,
  ALLOWED_TRANSITIONS,
  PUBLIC_STATUS,
  assertTransition,
  isTerminal,
  IllegalTransitionError,
  NotFoundError as OrderNotFoundError,
  ValidationError as OrderValidationError,
} from './src/orders'
export type {
  CreateOrderInput,
  OrderListFilters,
  OrderSummaryDto,
  OrderDetailDto,
  OrderItemDto,
  OrderEventDto,
  OrderPaymentDto,
  PublicStatus,
  ActorContext as OrderActorContext,
} from './src/orders'

/* ─── Payments (gateway abstraction + sandbox provider) ──────────────────── */

export {
  startDummyPayment,
  confirmDummyPayment,
  getPaymentGateway,
  getPaymentProviderName,
  FakePaymentProvider,
  TEST_CARD,
  PaymentNotFoundError,
  PaymentStateError,
} from './src/payments'
export type {
  PaymentGateway,
  PaymentProviderName,
  CardDetails,
  AuthorizeInput,
  AuthorizeResult,
} from './src/payments'

/* ─── tSIM provider (read-only verification — Phase 4H.2A) ───────────────── */

export { TsimClient, fulfilOrderViaTsim } from './src/providers/tsim'
export type { TsimCallResult, TsimResponse, TsimDataplan, FulfilResult } from './src/providers/tsim'

/* ─── Admin Operations Center (Phase 4G) ─────────────────────────────────── */

export {
  getDashboardSummary as getAdminDashboardSummary,
  listUsers as listAdminUsers,
  getUserDetail as getAdminUserDetail,
  setUserStatus,
  setUserRole,
  ForbiddenError as AdminForbiddenError,
  listEsimProviders,
  listPaymentProviders,
  setEsimProviderStatus,
  setPaymentProviderStatus,
  listAuditLog,
  listAuditEntities,
  listAdminTickets,
  getAdminTicket,
  adminReplyToTicket,
  setTicketStatus,
  runHealthChecks,
  AdminError,
  // FAQs
  listFaqs,
  listFaqCategories,
  createFaq,
  updateFaq,
  setFaqPublished,
  deleteFaq,
  reorderFaqs,
  // Reviews
  listReviews,
  getReviewStats,
  setReviewStatus,
  setReviewHidden,
  deleteReview,
  // Payments
  listPayments,
  getPaymentDetail,
  getPaymentStats,
  // Plans
  listAdminPlans,
  getPlanFilterOptions,
  setPlanActive,
  prepareProviderSync,
  // Settings
  SETTINGS_REGISTRY,
  getSettings,
  getPublicSettings,
  updateSettings,
} from './src/admin'
export type {
  DashboardSummary as AdminDashboardSummary,
  AdminUserListItem,
  AdminUserDetail,
  ListUsersFilters,
  EsimProviderDto,
  PaymentProviderDto,
  AuditLogEntryDto,
  AuditFilters,
  AdminTicketSummary,
  AdminTicketDetail,
  TicketFilters,
  ServiceHealthDto,
  SystemHealthReport,
  HealthSeverity,
  AdminActorContext,
  // FAQs
  AdminFaqDto,
  FaqFilters,
  FaqInput,
  // Reviews
  AdminReviewDto,
  AdminReviewStatusFilter,
  ReviewFilters,
  ReviewStatsDto,
  // Payments
  AdminPaymentDto,
  AdminPaymentDetailDto,
  AdminPaymentEventDto,
  PaymentFilters,
  PaymentStatsDto,
  // Plans
  AdminPlanDto,
  PlanFilters,
  PlanFilterOptions,
  SyncPreparationDto,
  // Settings
  SettingDto,
  SettingDef,
  SettingsActor,
} from './src/admin'
