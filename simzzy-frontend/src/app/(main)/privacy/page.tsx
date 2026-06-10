import type { Metadata } from 'next'
import { InfoShell, InfoSection, InfoHelpNote } from '@/components/layout/InfoShell'
import { COMPANY } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Simzzy collects, uses, and protects your personal data.',
  alternates: { canonical: '/privacy' },
}

const LIST = 'list-disc pl-5 space-y-1.5'
const SUB = 'font-semibold text-primary'

export default function PrivacyPage() {
  return (
    <InfoShell eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: June 2026">
      <InfoSection heading="1. Information we collect">
        <p>We collect information you provide directly to us and information generated through your use of the service.</p>
        <p className={SUB}>Information you provide</p>
        <ul className={LIST}>
          <li>Email address (required for account creation)</li>
          <li>First name, last name, and country (collected during onboarding)</li>
          <li>Order and payment details processed through our payment partner (we do not store card numbers)</li>
          <li>Support messages and correspondence</li>
        </ul>
        <p className={SUB}>Automatically collected information</p>
        <ul className={LIST}>
          <li>Device type and operating system (for compatibility and support)</li>
          <li>IP address and approximate location (for fraud prevention)</li>
          <li>Session data and usage analytics (anonymized)</li>
        </ul>
        <p>We do not collect or store payment card details. All payment processing is handled by our PCI-DSS compliant payment partner.</p>
      </InfoSection>

      <InfoSection heading="2. How we use your information">
        <p>We use the information we collect to:</p>
        <ul className={LIST}>
          <li>Create and manage your Simzzy account</li>
          <li>Process purchases and deliver eSIM QR codes to your email</li>
          <li>Send transactional emails (order confirmations, QR codes, receipts)</li>
          <li>Provide customer support and resolve disputes</li>
          <li>Detect and prevent fraudulent or unauthorized activity</li>
          <li>Improve our platform using aggregated, anonymized analytics</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do not use your information for advertising targeting or sell it to third parties.</p>
      </InfoSection>

      <InfoSection heading="3. Sharing of information">
        <p>We share your information only in limited circumstances:</p>
        <p className={SUB}>Service providers</p>
        <p>We share data with trusted third parties who help us operate the platform, including:</p>
        <ul className={LIST}>
          <li>Our payment partner (payment processing)</li>
          <li>Resend (transactional email delivery)</li>
          <li>eSIM provider APIs (to provision your eSIM — they receive your order details, not personal identifiers)</li>
          <li>Our cloud infrastructure provider (hosting and security)</li>
        </ul>
        <p className={SUB}>Legal requirements</p>
        <p>We may disclose information if required by law, subpoena, or other legal process, or if we believe in good faith that disclosure is necessary to protect rights, safety, or property.</p>
        <p className={SUB}>Business transfers</p>
        <p>In the event of a merger or acquisition, your information may be transferred as part of that transaction. We will notify you before any such transfer.</p>
        <p>We never sell, rent, or share your personal data with advertisers.</p>
      </InfoSection>

      <InfoSection heading="4. Cookies & tracking">
        <p>We use minimal, necessary cookies to operate the platform:</p>
        <ul className={LIST}>
          <li><strong className="text-primary">Session cookies:</strong> To keep you logged in during a browser session</li>
          <li><strong className="text-primary">Preference cookies:</strong> To remember theme and language settings</li>
          <li><strong className="text-primary">Analytics cookies:</strong> Anonymized usage data via privacy-respecting analytics (no cross-site tracking)</li>
        </ul>
        <p>We do not use advertising cookies, Facebook Pixel, or third-party retargeting trackers.</p>
        <p>You can disable cookies in your browser settings. Note that disabling session cookies will log you out on each visit.</p>
      </InfoSection>

      <InfoSection heading="5. Data retention">
        <p>We retain your personal data for as long as your account is active or as needed to provide services.</p>
        <ul className={LIST}>
          <li><strong className="text-primary">Account data:</strong> Retained while your account is open. Deleted within 30 days of a verified account deletion request.</li>
          <li><strong className="text-primary">Order and transaction records:</strong> Retained for 7 years for financial and legal compliance purposes.</li>
          <li><strong className="text-primary">Support correspondence:</strong> Retained for 3 years.</li>
          <li><strong className="text-primary">Analytics data:</strong> Anonymized and aggregated — no retention limit.</li>
        </ul>
        <p>
          You may request deletion of your account and associated personal data at any time by contacting{' '}
          <a href={`mailto:${COMPANY.supportEmail}`} className="text-accent-pink font-semibold hover:underline">
            {COMPANY.supportEmail}
          </a>
          .
        </p>
      </InfoSection>

      <InfoSection heading="6. Your rights">
        <p>Depending on your jurisdiction, you may have the following rights:</p>
        <ul className={LIST}>
          <li><strong className="text-primary">Access:</strong> Request a copy of the personal data we hold about you</li>
          <li><strong className="text-primary">Correction:</strong> Request that inaccurate data be corrected</li>
          <li><strong className="text-primary">Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
          <li><strong className="text-primary">Portability:</strong> Request your data in a structured, machine-readable format</li>
          <li><strong className="text-primary">Objection:</strong> Object to processing of your data in certain circumstances</li>
          <li><strong className="text-primary">Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href={`mailto:${COMPANY.supportEmail}`} className="text-accent-pink font-semibold hover:underline">
            {COMPANY.supportEmail}
          </a>{' '}
          with your request and your registered email address. We will respond within 30 days.
        </p>
      </InfoSection>

      <InfoSection heading="7. Security">
        <p>We take reasonable technical and organizational measures to protect your personal data, including:</p>
        <ul className={LIST}>
          <li>HTTPS encryption for all data in transit</li>
          <li>Data stored on encrypted cloud infrastructure</li>
          <li>Access controls limiting who on our team can view personal data</li>
          <li>Regular security reviews</li>
        </ul>
        <p>No system is 100% secure. If you believe your account has been compromised, please contact support immediately.</p>
      </InfoSection>

      <InfoSection heading="8. Contact & company information">
        <p>For privacy-related questions or requests, contact us at:</p>
        <p>
          <strong className="text-primary">Email:</strong>{' '}
          <a href={`mailto:${COMPANY.supportEmail}`} className="text-accent-pink font-semibold hover:underline">
            {COMPANY.supportEmail}
          </a>
        </p>
        <address className="not-italic">
          <span className="block font-semibold text-primary">{COMPANY.name}</span>
          {COMPANY.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
        <p>
          We may update this policy periodically. When we make significant changes, we will notify you by email or via a
          notice on our platform. The &ldquo;last updated&rdquo; date at the top of this page reflects the most recent revision.
        </p>
      </InfoSection>

      <InfoHelpNote />
    </InfoShell>
  )
}
