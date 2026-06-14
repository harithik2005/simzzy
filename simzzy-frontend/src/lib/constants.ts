import type { NavLink, FooterSection } from './types'

/** Canonical public origin (no trailing slash). Env-driven so staging/preview
 *  deployments don't hardcode the production domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://simzzy.shop').replace(/\/+$/, '')

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Browse eSIMs', href: '/browse' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Support', href: '/support' },
]

export const FOOTER_LINKS: Record<string, FooterSection[]> = {
  product: [
    { label: 'Browse eSIMs', href: '/browse' },
    { label: 'Regional Plans', href: '/browse' },
    { label: 'Global Plans', href: '/browse?region=Global' },
    { label: 'How it works', href: '/#how-it-works' },
  ],
  support: [
    { label: 'Help Center', href: '/support' },
    { label: 'Device Compatibility', href: '/device-check' },
    { label: 'Installation Guide', href: '/support' },
    { label: 'Contact Us', href: '/contact' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Refund Policy', href: '/refund' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

/** Registered company / legal entity — single source of truth used by the
 *  footer, contact page, and legal pages so the name + address never drift. */
export const COMPANY = {
  name: 'Simzzy Limited',
  addressLines: ['Room 13, 27/F, EGL Tower', 'Kowloon, Hong Kong'],
  addressInline: 'Room 13, 27/F, EGL Tower, Kowloon, Hong Kong',
  supportEmail: 'support@simzzy.com',
} as const

export const SOCIAL_LINKS = [
  { label: 'X (Twitter)', href: 'https://x.com' },
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
] as const

export const PAYMENT_METHODS = ['VISA', 'MC', 'UPI', 'GPay'] as const
