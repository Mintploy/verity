import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div className="v-section v-max">
        <div style={{ maxWidth: 760 }}>
          <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>Legal</span>
          <h1 className="v-display-md v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px' }}>
            Terms of Service
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', margin: '0 0 56px' }}>
            Effective May 27, 2026 · Mintploy, Inc. · Los Angeles, CA
          </p>

          {[
            {
              title: '1. Acceptance',
              body: 'By creating an account and using Verity, you agree to these Terms. If you do not agree, do not use the service. These Terms constitute a binding agreement between you and Mintploy, Inc.',
            },
            {
              title: '2. Eligibility',
              body: 'Verity is exclusively for verified women aged 18 and older. By completing identity verification, you represent that you are a woman and that you are 18 years of age or older. We reserve the right to terminate accounts that do not meet eligibility requirements.',
            },
            {
              title: '3. Permitted use',
              body: 'Verity is for personal safety research only. You may use Verity to conduct background research on individuals for your own personal, non-commercial purposes — for example, researching someone you are considering dating. You may not use Verity for employment screening, tenant screening, credit decisions, or any purpose governed by the Fair Credit Reporting Act.',
            },
            {
              title: '4. Prohibited use',
              body: 'You may not: use Verity to harass, stalk, or harm any individual; share report data with unauthorized third parties for commercial purposes; attempt to reverse-engineer or scrape the service; use the service for any unlawful purpose; or attempt to circumvent our identity verification or access controls.',
            },
            {
              title: '5. Accuracy of data',
              body: 'Verity aggregates publicly available records from third-party data sources. We do not guarantee the accuracy, completeness, or timeliness of report data. Public records contain errors. A Verity report is a research tool, not a definitive background check. Do not make consequential decisions based solely on a Verity report.',
            },
            {
              title: '6. Membership and payment',
              body: 'Membership is billed annually at $99/year. Your membership renews automatically at the end of each billing period unless you cancel. You may cancel at any time; cancellation takes effect at the end of the current billing period. All payments are final and non-refundable except as required by law.',
            },
            {
              title: '7. Privacy',
              body: 'Our Privacy Policy describes how we collect and use your data. By using Verity, you agree to the collection and use described in our Privacy Policy.',
            },
            {
              title: '8. Limitation of liability',
              body: 'To the fullest extent permitted by law, Mintploy, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of Verity. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.',
            },
            {
              title: '9. Indemnification',
              body: 'You agree to indemnify and hold harmless Mintploy, Inc. from any claims, damages, or expenses arising from your use of Verity in violation of these Terms or applicable law.',
            },
            {
              title: '10. Governing law',
              body: 'These Terms are governed by the laws of the State of California. Any disputes shall be resolved in the courts of Los Angeles County, California.',
            },
            {
              title: '11. Changes',
              body: 'We may update these Terms from time to time. We will notify you of material changes by email. Continued use of Verity after changes constitutes acceptance of the revised Terms.',
            },
            {
              title: '12. Contact',
              body: 'Questions about these Terms: hello@verityprive.com · Mintploy, Inc. · Los Angeles, CA 90001',
            },
          ].map((section, i) => (
            <div key={i} style={{ marginBottom: 40 }}>
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
              See also our{' '}
              <Link href="/privacy" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Privacy Policy</Link>
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
