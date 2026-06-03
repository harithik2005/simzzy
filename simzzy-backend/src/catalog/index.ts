/**
 * Simzzy backend — catalog module barrel (Phase 4G.5).
 * Query layer for the redesigned Browse experience + the XLSX importer.
 */
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
} from './service'
export type {
  DestinationSummary,
  PlanCardDto,
  CoverageDto,
  CoverageCountryDto,
  CoverageMap,
  DailyPlansResult,
} from './service'

export { slugify, classifyData, DAILY_TIERS } from './classify'
export type { DataTier, DataClassification } from './classify'
