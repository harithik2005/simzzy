import type { Metadata } from 'next'
import { InfoShell, InfoSection, InfoHelpNote } from '@/components/layout/InfoShell'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Simzzy collects, uses, and protects your personal data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <InfoShell eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: May 2026">
      <InfoSection heading="Information we collect">
        <p>We collect the information you provide at checkout (name, email) and basic usage data needed to deliver and support your eSIM. We do not store your full payment card details.</p>
      </InfoSection>
      <InfoSection heading="How we use it">
        <p>To provision your eSIM, send your QR code and order updates, provide support, and improve our service. We never sell your personal data.</p>
      </InfoSection>
      <InfoSection heading="Cookies & local storage">
        <p>We use local storage to remember your display currency and session preferences. These are not used for advertising.</p>
      </InfoSection>
      <InfoSection heading="Your rights">
        <p>You can request access to or deletion of your data at any time from your dashboard or by contacting support. Deletion is completed within 30 days.</p>
      </InfoSection>
      <InfoHelpNote />
    </InfoShell>
  )
}
