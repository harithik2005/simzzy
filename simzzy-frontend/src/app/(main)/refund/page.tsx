import type { Metadata } from 'next'
import { InfoShell, InfoSection, InfoHelpNote } from '@/components/layout/InfoShell'
import { COMPANY } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When and how you can request a refund on a Simzzy eSIM.',
  alternates: { canonical: '/refund' },
}

const LIST = 'list-disc pl-5 space-y-1.5'

export default function RefundPage() {
  return (
    <InfoShell eyebrow="Legal" title="Refund Policy" subtitle="Last updated: June 2026">
      <InfoSection heading="At a glance">
        <ul className={LIST}>
          <li><strong className="text-primary">Refund window:</strong> 7 days from purchase for unactivated eSIMs.</li>
          <li><strong className="text-primary">Processing time:</strong> 5–10 business days to your original payment method.</li>
          <li>
            <strong className="text-primary">How to request:</strong> Email{' '}
            <a href={`mailto:${COMPANY.supportEmail}`} className="text-accent-pink font-semibold hover:underline">
              {COMPANY.supportEmail}
            </a>{' '}
            with your order reference.
          </li>
        </ul>
      </InfoSection>

      <InfoSection heading="Eligible for a refund">
        <p>You are eligible for a refund if:</p>
        <ul className={LIST}>
          <li>Your eSIM QR code was never delivered (after a 30-minute wait)</li>
          <li>The eSIM was purchased but never installed or activated on any device</li>
          <li>You purchased a plan for an incompatible device and have not attempted installation</li>
          <li>A duplicate charge was made due to a payment processing error</li>
        </ul>
      </InfoSection>

      <InfoSection heading="Not eligible for a refund">
        <ul className={LIST}>
          <li>The eSIM QR code has been installed on a device (service has been consumed)</li>
          <li>Data has been used — even partially</li>
          <li>The plan has expired due to the validity period ending</li>
          <li>You changed your mind after installation</li>
          <li>Network outages caused by third-party carriers (we will assist in escalation)</li>
          <li>More than 7 days have passed since purchase (for unactivated plans)</li>
        </ul>
      </InfoSection>

      <InfoSection heading="How to request a refund">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="text-primary">Contact support.</strong> Email{' '}
            <a href={`mailto:${COMPANY.supportEmail}`} className="text-accent-pink font-semibold hover:underline">
              {COMPANY.supportEmail}
            </a>{' '}
            or use the Contact page. Include your registered email and order reference number.
          </li>
          <li><strong className="text-primary">We verify eligibility.</strong> Our team checks your order status and confirms whether the eSIM was activated. This takes under 2 hours.</li>
          <li><strong className="text-primary">Refund approved.</strong> If eligible, we approve the refund and initiate the reversal to your original payment method.</li>
          <li><strong className="text-primary">Funds returned.</strong> Refunds typically appear within 5–10 business days depending on your card issuer or bank processing times.</li>
        </ol>
      </InfoSection>

      <InfoSection heading="Additional notes">
        <p><strong className="text-primary">Automatic refunds for failed delivery:</strong> If our system detects that a QR code was not delivered within 30 minutes of a successful payment, a refund is automatically initiated without requiring you to contact us.</p>
        <p><strong className="text-primary">Chargebacks:</strong> We strongly encourage you to contact our support team before initiating a chargeback with your bank. Chargebacks have significant processing costs and may result in account suspension. We resolve all legitimate complaints quickly.</p>
        <p><strong className="text-primary">Currency:</strong> Refunds are returned in the original currency and payment method used at checkout. Currency conversion differences due to exchange rate fluctuations are not covered.</p>
        <p><strong className="text-primary">Policy changes:</strong> This policy may be updated. Purchases made before a policy update are subject to the policy in effect at the time of purchase.</p>
      </InfoSection>

      <InfoSection heading="Company information">
        <p>
          This refund policy is operated by <strong className="text-primary">{COMPANY.name}</strong>.
        </p>
        <address className="not-italic">
          {COMPANY.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
        <p>
          To request a refund, contact us at{' '}
          <a href={`mailto:${COMPANY.supportEmail}`} className="text-accent-pink font-semibold hover:underline">
            {COMPANY.supportEmail}
          </a>
          .
        </p>
      </InfoSection>

      <InfoHelpNote />
    </InfoShell>
  )
}
