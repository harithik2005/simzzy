import type { NavLink, FooterSection } from './types'

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

export const SOCIAL_LINKS = [
  { label: 'X (Twitter)', href: 'https://x.com' },
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
] as const

export const PAYMENT_METHODS = ['VISA', 'MC', 'UPI', 'GPay'] as const
