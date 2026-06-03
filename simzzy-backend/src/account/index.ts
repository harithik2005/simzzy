/**
 * Simzzy backend — account module barrel.
 * Customer-facing profile, password, preferences, dashboard, orders + eSIMs.
 */
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
} from './service'

export type { AccountOrderDto, AccountEsimDto } from './service'

export type {
  ProfileDto,
  PreferencesDto,
  DashboardSummaryDto,
  UpdateProfileInput,
  UpdatePreferencesInput,
  ChangePasswordInput,
} from './types'
