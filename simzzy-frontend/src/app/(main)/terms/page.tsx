import type { Metadata } from 'next'
import { InfoShell, InfoSection, InfoHelpNote } from '@/components/layout/InfoShell'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of Simzzy eSIM products and services.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <InfoShell eyebrow="Legal" title="Terms of Service" subtitle="Last updated: May 2026">
      <InfoSection heading="1. Acceptance of terms">
        <p>By purchasing or using a Simzzy eSIM, you agree to these terms. If you do not agree, please do not use the service.</p>
      </InfoSection>
      <InfoSection heading="2. Service description">
        <p>Simzzy provides prepaid mobile data eSIM plans for use in supported destinations. Plans are data-only unless otherwise stated and begin when you first connect to a network at your destination.</p>
      </InfoSection>
      <InfoSection heading="3. Device compatibility">
        <p>You are responsible for confirming your device supports eSIM and is carrier-unlocked before purchase. Use our device checker if you are unsure.</p>
      </InfoSection>
      <InfoSection heading="4. Payments">
        <p>Prices are shown in USD and converted to your local currency for display. Payments are processed securely via our payment partner. You authorize us to charge the total shown at checkout.</p>
      </InfoSection>
      <InfoSection heading="5. Acceptable use">
        <p>Plans are for personal use and subject to fair-usage policies. Reselling, abuse, or fraudulent activity may result in suspension without refund.</p>
      </InfoSection>
      <InfoHelpNote />
    </InfoShell>
  )
}
