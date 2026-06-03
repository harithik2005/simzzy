import type { Role, UserStatus } from '@prisma/client'

export type ProfileDto = {
  id: string
  name: string | null
  email: string
  phone: string | null
  countryCode: string | null
  timezone: string | null
  role: Role
  status: UserStatus
  memberSince: string // ISO date
  lastLoginAt: string | null
}

export type PreferencesDto = {
  emailNotifications: boolean
  orderUpdates: boolean
  expiryReminders: boolean
  marketingEmail: boolean
  smsNotifications: boolean
  preferredCurrency: string | null
  preferredLanguage: string | null
}

export type DashboardSummaryDto = {
  user: {
    id: string
    name: string | null
    email: string
    role: Role
    memberSince: string
  }
  stats: {
    totalOrders: number
    activeEsims: number
    expiredEsims: number
    openTickets: number
    totalDataUsedMb: number
  }
  recentActivity: Array<{
    kind: 'order' | 'ticket'
    id: string
    title: string
    subtitle: string | null
    createdAt: string
  }>
}

export type UpdateProfileInput = {
  name?: string | null
  phone?: string | null
  countryCode?: string | null
  timezone?: string | null
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export type UpdatePreferencesInput = Partial<PreferencesDto>
