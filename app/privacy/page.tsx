import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div className="v-section v-max">
        <div style={{ maxWidth: 760 }}>
          <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>Legal</span>
          <h1 className="v-display-md v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px' }}>
            Privacy Policy
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', margin: '0 0 56px' }}>
            Effective August 26, 2026 · Mintploy, Inc. · Los Angeles, CA
          </p>

          {[
            {
              title: '1. Who we are',
              body: 'Verity is a product of Mintploy, Inc. ("we," "us," "our"). We operate verityprive.com, a background research platform exclusively for verified women. Questions: verity@mintploy.com.',
            },
            {
              title: '2. What we collect',
              body: 'We collect your email address when you register, your Stripe customer ID for payment processing, and authentication tokens stored in secure httpOnly cookies. When you run a search, the phone number and name you enter are transmitted to our servers and to the third-party data providers listed in Section 7 in order to generate your report. If you choose to save a report to "His File," we store the associated name, phone number, safety score, and any personal notes or details you voluntarily enter about that individual. His File data is private to you, encrypted at rest, and deleted when you remove the entry or close your account. We do not use your searches for advertising or profiling.',
            },
            {
              title: '3. How we use your information',
              body: 'Your email is used to send authentication links and service communications. Your Stripe customer ID is used to verify your active membership on each login. Search queries are used solely to generate the report you requested, by querying the third-party data providers in Section 7. We do not sell your information or use it for advertising.',
            },
            {
              title: '4. Identity verification',
              body: 'Identity verification is performed by Stripe Identity, a third-party service. We receive only the outcome of the verification (verified / not verified) and your confirmed gender. We do not receive or store images of your government-issued ID or selfie. Stripe\'s privacy policy governs their handling of your identity data.',
            },
            {
              title: '5. Payment processing',
              body: 'Payments are processed by Stripe. We never see, receive, or store your card number or banking information. Stripe is PCI DSS Level 1 certified. Stripe\'s privacy policy governs their handling of your payment data.',
            },
            {
              title: '6. Cookies',
              body: 'We use one session cookie ("verity-session") to maintain your login state. This is a secure, httpOnly cookie that cannot be accessed by JavaScript. We also use a temporary cookie ("verity-pending-email") that persists for one hour during the signup flow. We do not use advertising cookies, analytics cookies, or third-party tracking.',
            },
            {
              title: '7. Data sharing',
              body: 'To generate reports, the phone number and name you search are shared with third-party data providers, which may include phone-intelligence, public-record, and background-data services (for example, providers of carrier data, court and bankruptcy records, property records, and sex-offender registry checks). We also share data with: (a) Stripe, for payment and identity processing; (b) Resend, for transactional email delivery; and (c) any party required by law or valid legal process. We do not sell or rent your personal information.',
            },
            {
              title: '8. Data retention',
              body: 'We retain your email and Stripe customer ID for as long as your account is active. When you run a search, your query is transmitted to third-party providers; the raw query is not retained beyond that request. If you save a result to His File, the name, phone number, safety score, and any notes you enter are stored until you delete that entry or your account. You can delete individual His File entries at any time from the His File page. You can delete your account and all associated data at any time from Settings → Delete account; deletion is immediate and irreversible. You may also request deletion by emailing verity@mintploy.com.',
            },
            {
              id: 'do-not-sell',
              title: '9. Do not sell my personal information',
              body: 'We do not sell your personal information. If you are a California resident, you have the right under CCPA to request disclosure of what personal information we collect and to request deletion. You can delete all your data instantly at any time through Settings → Delete account. You may also contact verity@mintploy.com to exercise these rights.',
            },
            {
              title: '10. Security',
              body: 'Session tokens are signed with 256-bit secrets and verified on every request. All traffic is encrypted in transit via TLS. We do not store passwords. Authentication is exclusively via time-limited magic links.',
            },
            {
              title: '11. Changes to this policy',
              body: 'We will notify you by email if we make material changes to this policy. Continued use of Verity after changes constitutes acceptance.',
            },
          ].map((section, i) => (
            <div key={i} id={section.id} style={{ marginBottom: 40 }}>
              <h2 style={{
                fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400,
                color: 'var(--primary-deep)', margin: '0 0 14px',
              }}>{section.title}</h2>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)',
                lineHeight: 1.75, margin: 0, fontWeight: 300,
              }}>{section.body}</p>
            </div>
          ))}

          <div style={{
            marginTop: 24, padding: '24px 28px', background: 'var(--pearl)',
            borderRadius: 'var(--r-lg)', borderLeft: '3px solid var(--gold)',
          }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)', margin: 0, fontWeight: 300, lineHeight: 1.6 }}>
              Questions about this policy? Contact us at{' '}
              <a href="mailto:verity@mintploy.com" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                verity@mintploy.com
              </a>
              . See also our{' '}
              <Link href="/terms" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/fcra" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>FCRA Notice</Link>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
