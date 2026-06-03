import type { Metadata } from 'next'
import { InfoShell, InfoSection, InfoHelpNote } from '@/components/layout/InfoShell'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When and how you can request a refund on a Simzzy eSIM.',
  alternates: { canonical: '/refund' },
}

export default function RefundPage() {
  return (
    <InfoShell eyebrow="Legal" title="Refund Policy" subtitle="Last updated: May 2026">
      <InfoSection heading="Eligibility">
        <p>You are eligible for a full refund if your eSIM has <strong className="text-primary">not been activated</strong> — that is, it has not yet connected to a network at your destination.</p>
      </InfoSection>
      <InfoSection heading="Non-refundable cases">
        <p>Once an eSIM is activated and data has started, the plan is non-refundable. Refunds are also unavailable where a device was incompatible despite our compatibility guidance.</p>
      </InfoSection>
      <InfoSection heading="How to request a refund">
        <p>Contact support with your order ID. Approved refunds are issued to your original payment method within 5–10 business days.</p>
      </InfoSection>
      <InfoSection heading="Faulty plans">
        <p>If a plan fails to work due to a technical issue on our side, we&apos;ll replace it or issue a full refund — no questions asked.</p>
      </InfoSection>
      <InfoHelpNote />
    </InfoShell>
  )
}
