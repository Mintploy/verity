import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';

const faqs = [
  {
    section: 'How it works',
    id: 'how-it-works',
    items: [
      {
        q: 'What do I need to run a search?',
        a: "His phone number is all that's strictly required. Adding his first and last name sharpens the cross-reference and returns more complete results — but a number alone is enough to begin.",
      },
      {
        q: 'How long does a report take?',
        a: "Most reports return in 10–20 seconds. We cross-reference seven independent sources in parallel. Complex records — multiple addresses, legal filings, business registrations — can take up to 45 seconds.",
      },
      {
        q: 'Will he know I searched him?',
        a: "No. Verity searches public record databases. We do not contact the subject, send notifications, or leave any trace of your inquiry. Your search is completely private.",
      },
      {
        q: 'What sources do you use?',
        a: "Whitepages Pro (carrier and identity), ATTOM (property and address history), BeenVerified (public records aggregation), Proxycurl (professional data), PACER (federal court records), FEC (political donations), and NSOPW (sex offender registry). Seven sources, cross-referenced and scored.",
      },
    ],
  },
  {
    section: 'Scoring',
    id: 'scoring',
    items: [
      {
        q: 'What does the score mean?',
        a: "Green means no significant flags across our seven sources — the picture the data paints matches what a person would reasonably represent about themselves. Yellow means inconsistencies or single flags that warrant a conversation. Red means one or more serious flags: active marriages, sex offender registry matches, recent criminal filings, or identity that cannot be verified.",
      },
      {
        q: 'Can a green score be wrong?',
        a: "Yes. A green score means the data we can access looks clean — it is not a guarantee of character. Public records are a snapshot, not a soul. We are a research tool, not a verdict.",
      },
      {
        q: 'What is a "recommendation" in the report?',
        a: "The last section of every report gives you 3–5 plain-English next steps — what to ask about, what to watch for, when to take more time. We write it the way a sharp older sister would: honest, direct, and on your side.",
      },
    ],
  },
  {
    section: 'Membership & billing',
    id: 'billing',
    items: [
      {
        q: 'What does membership include?',
        a: "One annual membership ($99/year) gives you unlimited background reports for 12 months, phone intelligence on any number, the Compare feature to evaluate multiple men side by side, PDF export, and 30-day re-run reminders when a report approaches a month old.",
      },
      {
        q: 'Can I cancel?',
        a: "Yes, any time. Your membership remains active through the current billing period. We do not prorate refunds, but you will not be charged for the next renewal if you cancel before it.",
      },
      {
        q: 'Is my payment information secure?',
        a: "All payments are processed by Stripe. We never see, store, or handle your card number. Stripe is PCI Level 1 certified — the highest level of payment security certification.",
      },
    ],
  },
  {
    section: 'Verification & access',
    id: 'verification',
    items: [
      {
        q: 'Why do I need to verify my identity?',
        a: "Verity is exclusively for women. The identity gate exists so the room stays safe — so that every member knows everyone else has been verified by the same standard. We use Stripe Identity for the check: a government ID and a selfie. The whole process takes about 90 seconds.",
      },
      {
        q: 'What happens to my identity documents?',
        a: "Your ID and selfie are processed by Stripe Identity, not stored by Verity. We receive only a verification decision (verified / not verified) and your confirmed gender. We do not have access to images of your documents.",
      },
      {
        q: 'What if my verification is declined?',
        a: "Stripe Identity may decline if the document is unclear, the selfie does not match, or the document is expired. You can re-attempt the verification from the same link. If you continue to have trouble, contact us at verity@mintploy.com.",
      },
    ],
  },
  {
    section: 'Privacy & data',
    id: 'sources',
    items: [
      {
        q: 'What data do you store about me?',
        a: "We store your email address and your Stripe customer ID. We do not store your searches, your reports, or the phone numbers you look up. Reports are held temporarily in your browser session only.",
      },
      {
        q: 'Do you sell my data?',
        a: "No. We do not sell, share, or monetize your personal information. See our Privacy Policy for the full picture.",
      },
      {
        q: 'Is Verity legal to use?',
        a: "Yes, for personal use. Public record searches are legal. Verity is not a consumer reporting agency under the FCRA and may not be used for employment, housing, or credit decisions. See our FCRA notice for details.",
      },
    ],
  },
  {
    section: 'For the press',
    id: 'press',
    items: [
      {
        q: 'Media inquiries',
        a: "For press inquiries, interviews, or partnership opportunities, please reach out to verity@mintploy.com with the subject line \"Press.\" We're based in Los Angeles and happy to speak on background.",
      },
    ],
  },
  {
    section: 'For brands',
    id: 'brands',
    items: [
      {
        q: 'Enterprise and partnership opportunities',
        a: "We work with select women's platforms, safety organizations, and media brands on integration and co-branded experiences. Reach us at verity@mintploy.com with the subject line \"Partnership.\"",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div className="v-section v-max">
        <div style={{ maxWidth: 760, marginBottom: 64 }}>
          <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>Help center</span>
          <h1 className="v-display-lg v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: '0 0 24px' }}>
            Questions,{' '}
            <em style={{ color: 'var(--rose)' }}>answered honestly.</em>
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.7, margin: '0 0 32px', fontWeight: 300 }}>
            Can't find what you need? Email us at{' '}
            <a href="mailto:verity@mintploy.com" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
              verity@mintploy.com
            </a>
            . We respond within one business day.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {faqs.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 style={{
                fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400,
                color: 'var(--primary-deep)', margin: '0 0 28px',
                paddingBottom: 16, borderBottom: '1px solid var(--gold-pale)',
              }}>{section.section}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {section.items.map((item, i) => (
                  <div key={i} style={{
                    padding: '24px 0', borderBottom: '1px solid var(--ivory-deep)',
                  }}>
                    <h3 style={{
                      fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400,
                      color: 'var(--dark)', margin: '0 0 12px',
                    }}>{item.q}</h3>
                    <p style={{
                      fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)',
                      lineHeight: 1.7, margin: 0, fontWeight: 300, maxWidth: 720,
                    }}>{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 80, padding: '40px 36px', background: 'var(--pearl)',
          borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 24,
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, color: 'var(--dark)', margin: '0 0 8px' }}>
              Still have questions?
            </h3>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', margin: 0, fontWeight: 300 }}>
              We're a small team and we read every message.
            </p>
          </div>
          <a href="mailto:verity@mintploy.com" style={{
            padding: '14px 28px', borderRadius: 'var(--r-pill)',
            background: 'var(--primary)', color: 'var(--ivory)',
            textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 16,
            boxShadow: 'var(--shadow-pop)', whiteSpace: 'nowrap',
          }}>
            Email us →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}
