import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';
import { Bow } from '@/components/ui/Bow';

/**
 * This page used to carry five invented customer accounts, presented under the
 * line "These are real outcomes from real searches, shared with permission and
 * anonymized". None of them happened, and one described a capability Verity
 * does not have (dating-app activity from carrier data). It now carries only
 * what the report actually produces, which is checkable against the code.
 */

const SECTIONS: Array<{ title: string; body: string }> = [
  { title: 'Phone intelligence', body: 'Carrier, line type and how long the number has been in service. A VoIP line registered recently is flagged, because a second, disposable number is worth knowing about.' },
  { title: 'Identity', body: 'Full name, age, and the aliases and alternate spellings attached to the same record.' },
  { title: 'Address history', body: 'Where he has lived, when, and which address is current.' },
  { title: 'Property', body: 'Where a property record exists: owner, purchase price and date, assessed value, and the building itself, beds, baths, square footage and year built.' },
  { title: 'Relationships', body: 'Marriage and divorce records on file, plus the relatives and associates the record links to him.' },
  { title: 'Professional', body: 'Employment where it appears in the record, and business entities registered to his name.' },
  { title: 'Public records', body: 'Civil filings, bankruptcies, evictions, liens and judgments, and a sex offender registry check against NSOPW.' },
  { title: 'Social footprint', body: 'Confirmed handles, and any inconsistency between what the record says and what the profile claims.' },
];

const SCORES: Array<{ label: string; meaning: string; bg: string; color: string }> = [
  { label: 'Green', meaning: 'Nothing adverse surfaced across the sources checked. It is not a character reference, it means the record is clean.', bg: 'var(--sage-pale)', color: 'var(--sage-deep)' },
  { label: 'Yellow', meaning: 'Something is worth a conversation before you meet. A secondary line, an open civil matter, an address history that does not match what he has told you.', bg: 'var(--honey-pale)', color: 'var(--honey-deep)' },
  { label: 'Red', meaning: 'A registry match or a corroborated criminal record forces red on its own. It is not averaged away against the things that came back clean.', bg: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)' },
];

export default function WhatWeCheckPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div className="v-section v-max">
        <div style={{ maxWidth: 760, marginBottom: 56 }}>
          <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>What a report covers</span>
          <h1 className="v-display-lg" style={{ fontFamily: 'var(--display)', fontWeight: 500, color: 'var(--dark)', margin: '0 0 24px' }}>
            What we check,{' '}
            <span style={{ fontFamily: 'var(--script)', color: 'var(--primary)', fontSize: '1.25em' }}>and what we don&rsquo;t.</span>
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
            Every report is built from public and licensed records. Verity does not read his messages,
            track his location, or tell you who he is as a person. It tells you what the record says,
            and where the record and his story disagree.
          </p>
        </div>

        <div className="v-grid-2" style={{ gap: 20, marginBottom: 64 }}>
          {SECTIONS.map((s) => (
            <div key={s.title} style={{ padding: '24px 26px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 19, color: 'var(--dark)', marginBottom: 8 }}>{s.title}</div>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 760, marginBottom: 28 }}>
          <Bow size={34} color="var(--primary)" center="var(--blush)" />
          <h2 className="v-display-sm" style={{ fontFamily: 'var(--display)', fontWeight: 500, color: 'var(--dark)', margin: '16px 0 20px' }}>
            What the score means
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 56, maxWidth: 760 }}>
          {SCORES.map((s) => (
            <div key={s.label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 22px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' }}>
              <span style={{ padding: '5px 14px', borderRadius: 'var(--r-pill)', background: s.bg, color: s.color, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{s.label}</span>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{s.meaning}</p>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 760 }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--mauve-deep)', lineHeight: 1.7, margin: '0 0 22px' }}>
            Sources: Enformion, CourtListener, the FEC and NSOPW. Coverage varies by person and by
            state. A section with nothing in it means the record is empty, not that he is hiding
            something, and the report says which is which.
          </p>
          <Link href="/search" style={{
            display: 'inline-block', padding: '14px 30px', borderRadius: 'var(--r-pill)',
            background: 'var(--primary)', color: 'var(--pearl)', textDecoration: 'none',
            fontFamily: 'var(--display)', fontSize: 16, fontWeight: 500, boxShadow: 'var(--shadow-pop)',
          }}>
            Run a search
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
