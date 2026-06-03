import type { Metadata } from 'next'
import { InfoShell, InfoSection } from '@/components/layout/InfoShell'

export const metadata: Metadata = {
  title: 'About',
  description: 'Simzzy is a global travel eSIM platform keeping travelers connected in 150+ countries.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <InfoShell
      eyebrow="Company"
      title="About Simzzy"
      subtitle="We make staying connected abroad effortless — no roaming bills, no SIM swaps."
    >
      <InfoSection heading="Our mission">
        <p>
          Simzzy exists to remove the friction of staying online while you travel. Buy a plan online, scan a
          QR code, and connect to fast 4G/5G networks in 150+ countries — all without a physical SIM.
        </p>
      </InfoSection>
      <InfoSection heading="What we offer">
        <p>
          Instant eSIM delivery, transparent fixed pricing in your local currency, and 24/7 AI-powered
          support. From single-country plans to global coverage, there&apos;s a plan for every trip.
        </p>
      </InfoSection>
      <InfoSection heading="Trusted by travelers">
        <p>
          More than 500,000 travelers use Simzzy to stay connected, with an average rating of 4.8 from over
          12,000 reviews. We&apos;re just getting started.
        </p>
      </InfoSection>
    </InfoShell>
  )
}
