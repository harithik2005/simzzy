/**
 * Simzzy backend — pricing module barrel.
 *
 * Public surface = read-side service + write-side mutations + types. Routes and
 * other services import from this file via `simzzy-backend` rather than reaching
 * into the sub-files.
 */

export {
  getPriceBreakdown,
  getResolvedPrice,
  getResolvedProfit,
  getAppliedRule,
  calculateSellingPrice,
  refreshPlanCache,
  refreshAllCaches,
  refreshCachesForCountry,
  refreshCachesForDuration,
  getRuleSet,
  deriveStats,
} from './service'

export { loadActiveRules, resolveOne, appliedRuleOnly } from './resolver'
export type { ActiveRulesSnapshot } from './resolver'

export {
  updateGlobalRule,
  upsertCountryRule,
  deleteCountryRule,
  createDurationRule,
  updateDurationRule,
  deleteDurationRule,
  upsertPlanOverride,
  deletePlanOverride,
} from './mutations'
export type {
  ActorContext,
  UpdateGlobalInput,
  UpsertCountryInput,
  CreateDurationInput,
  UpdateDurationInput,
  UpsertOverrideInput,
} from './mutations'

export {
  logPricingChange,
  listPricingAuditLog,
  PRICING_ENTITIES,
  PRICING_ACTIONS,
} from './audit'
export type { PricingAuditEntry, PricingEntity, PricingAction } from './audit'

export type {
  GlobalRuleDto,
  CountryRuleDto,
  DurationRuleDto,
  OverrideRuleDto,
  PricingRuleSetDto,
  PricingStatsDto,
  ResolveInput,
  AppliedRuleSummary,
  PriceBreakdown,
} from './types'
