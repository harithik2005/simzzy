import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Secure Checkout',
  description: 'Complete your eSIM purchase securely and get your QR code instantly.',
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
