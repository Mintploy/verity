import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';

export default function FcraPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div className="v-section v-max">
        <div style={{ maxWidth: 760 }}>
          <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>Legal</span>
          <h1 className="v-display-md v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px' }}>
            FCRA Notice
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', margin: '0 0 56px' }}>
            Fair Credit Reporting Act Notice · Mintploy, Inc.
          </p>

          <div style={{
            padding: '28px 32px', background: 'var(--deeprose-pale)',
            borderRadius: 'var(--r-lg)', marginBottom: 48,
            borderLeft: '4px solid var(--deeprose)',
          }}>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--deeprose-deep)',
              lineHeight: 1.7, margin: 0, fontWeight: 400,
            }}>
              <strong>Important:</strong> Verity is NOT a consumer reporting agency as defined by the
              Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., and the information available
              through Verity may not be used as a "consumer report."
            </p>
          </div>

          {[
            {
              title: 'What this means',
              body: 'You may not use Verity or any information obtained from Verity to determine a person\'s eligibility for credit, insurance, employment, housing, or any other purpose that would constitute a "permissible purpose" under the FCRA. Using public record data for these purposes without proper FCRA compliance — including required disclosures and adverse action notices — is illegal.',
            },
            {
              title: 'Verity is for personal safety research only',
              body: 'Verity is designed and intended exclusively for personal use: researching individuals you are considering dating or meeting for your own personal safety and peace of mind. This is not a regulated use under the FCRA.',
            },
            {
              title: 'Prohibited uses',
              body: 'The following uses of Verity are strictly prohibited and constitute a violation of these Terms and applicable law: (1) employment screening or background checks for hiring decisions; (2) tenant screening for rental housing decisions; (3) creditworthiness determinations; (4) insurance eligibility decisions; (5) any other use that would require FCRA compliance.',
            },
            {
              title: 'No guarantee of accuracy',
              body: 'The information available through Verity is aggregated from publicly available sources and third-party data providers. We do not guarantee the accuracy, completeness, or currency of any data. Public records are frequently incomplete or contain errors. Do not make consequential decisions — personal, financial, or legal — based solely on a Verity report.',
            },
            {
              title: 'Dispute resolution',
              body: 'Because Verity is not a consumer reporting agency, we are not obligated to follow FCRA dispute procedures. If you believe information about you in a public record is inaccurate, you must contact the originating source (the county recorder, court system, or other government body) to seek correction.',
            },
            {
              title: 'Questions',
              body: 'If you have questions about appropriate use of Verity, contact us at hello@verityprive.com. If you believe you have found a use case that requires FCRA compliance, do not use Verity for that purpose — consult a qualified FCRA-compliant consumer reporting agency instead.',
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
              <Link href="/terms" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Terms of Service</Link>.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
