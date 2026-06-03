/**
 * Simzzy backend — plans module barrel.
 * Public surface for the catalog: query services, importer, and DTO types.
 */
export {
  listPlans,
  searchPlans,
  getPlanBySlug,
  getFeaturedPlans,
} from './service'

export { importMockPlans } from './import'
export type { ImportSummary } from './import'

export { plans as mockPlans } from './mockData'
export type { MockPlan } from './mockData'

export type {
  PlanSort,
  PlanListFilters,
  PlanListParams,
  PlanListItem,
  PlanListResult,
  PlanDetailDto,
} from './types'
