export type Region =
  | 'Asia'
  | 'Europe'
  | 'Americas'
  | 'Middle East'
  | 'Africa'
  | 'Oceania'
  | 'Global'

/**
 * Canonical eSIM plan, modelled on the tSIM provider catalogue so the frontend
 * maps cleanly onto the provider API once backend integration begins.
 *
 * The first nine fields mirror the tSIM product shape; the remainder are
 * presentation-only helpers the marketing/browse UI renders.
 */
export interface ESimPlan {
  esimId: string
  name: string
  region: Region
  destinations: string[]
  data: string
  fup: string
  days: number
  priceUsd: number
  apn: string

  // ── UI presentation fields ──
  country: string
  flag: string
  network: string
  speed: string
  popular: boolean
  badge?: string
}

export type Country = {
  name: string
  flag: string
  code: string
  region: Region
}

export type Review = {
  id: string
  name: string
  country: string
  flag: string
  rating: number
  text: string
  plan: string
  date: string
}

export type NavLink = {
  label: string
  href: string
}

export type FooterSection = {
  label: string
  href: string
}
