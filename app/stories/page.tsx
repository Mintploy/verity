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
  { title: 'Phone intelligence', body: 'Carrier, line type, and whether the line is still connected. A VoIP line is flagged, because a second, disposable number is worth knowing about.' },
  { title: 'Identity', body: 'Full name, age, and the aliases and alternate spellings attached to the same record.' },
  { title: 'Address history', body: 'Where he has lived, when each address was first and last reported, the county, and which address is current. Each is labelled as a home or an office where the record says which.' },
  { title: 'Property', body: 'For his current address: who is on the deed, purchase price and date, assessed value, and the building itself, beds, baths, square footage, lot size and year built. Being linked to a property is not the same as owning it, and the report keeps the two apart.' },
  { title: 'Criminal records', body: 'Arrests, convictions, warrants and sex offender records. These match on name, so each is checked against his age and the states he has lived in. A record we cannot tie to him is shown as unconfirmed rather than counted against him.' },
  { title: 'Sex offender registry', body: 'State registry records carried by the criminal records search. If that search does not complete, the report says the registry is unverified. It never reports a failed check as clear.' },
  { title: 'Sanctions and watchlists', body: 'OFAC sanctions screening against his name.' },
  { title: 'Evictions and pre-foreclosure', body: 'Eviction filings and pre-foreclosure notices attached to his record.' },
  { title: 'Financial records', body: 'Bankruptcies, judgments and liens, reported as the number of records on file.' },
  { title: 'Federal lawsuits', body: 'Federal court dockets, with the case, the court, when it was filed and whether it is still open. Matched by name, so each case needs confirming as him.' },
  { title: 'Relationships', body: 'Marriage and divorce records, and the relatives and associates the record links to him. A marriage record proves a marriage happened, not that it is current, and the report says so. Any relative can be searched in one tap.' },
  { title: 'Professional', body: 'Employment where the record carries it, professional licences, and the business entities registered to his name.' },
  { title: 'Political donations', body: 'Federal campaign contributions on file with the FEC.' },
  { title: 'Social footprint', body: 'Public profiles and email addresses that appear on the record. These are addresses on a record rather than confirmed accounts, and the report does not call them confirmed.' },
];

// The other half of the promise in the title. Naming these is what stops the
// list above from being read as "everything about him".
const NOT_CHECKED: string[] = [
  'His messages, his photos, his location, or anything else on his phone.',
  'His dating app activity. Nobody can see that, and anyone selling it is lying to you.',
  'Credit scores, bank balances or income.',
  'Medical, therapy or pharmacy records.',
  'Anything that would need his password, his consent, or a warrant.',
  'Whether he is a good man. The record cannot answer that, and neither can we.',
];

const SCORES: Array<{ label: string; meaning: string; bg: string; color: string }> = [
  { label: 'Green', meaning: 'Nothing adverse surfaced across the sources checked. It is not a character reference, it means the record is clean.', bg: 'var(--sage-pale)', color: 'var(--sage-deep)' },
  { label: 'Yellow', meaning: 'At least one thing surfaced, and none of it is grave. A VoIP number, a bankruptcy, an eviction, a judgment or a lien, an open federal docket. Your report names the specific reason it came back yellow, so you are never left guessing which one it was.', bg: 'var(--honey-pale)', color: 'var(--honey-deep)' },
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

        <div style={{ maxWidth: 760, marginBottom: 56 }}>
          <h2 className="v-display-sm" style={{ fontFamily: 'var(--display)', fontWeight: 500, color: 'var(--dark)', margin: '0 0 20px' }}>
            What we don&rsquo;t check
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NOT_CHECKED.map((line) => (
              <div key={line} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 18px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ color: 'var(--mauve-deep)', fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.5, flexShrink: 0 }}>&times;</span>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>{line}</p>
              </div>
            ))}
          </div>
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
            Sources: Enformion for identity, addresses, property, criminal, court, marriage and
            business records; CourtListener for federal dockets; the FEC for political donations.
            Coverage varies by person and by state. A section with nothing in it means the record is
            empty, not that he is hiding something, and the report says which is which. Where a
            check could not be completed at all, it is reported as unchecked rather than as clear.
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
