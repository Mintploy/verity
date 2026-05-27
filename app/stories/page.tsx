import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';

const stories = [
  {
    initial: 'S.',
    location: 'Los Angeles, CA',
    title: 'He had a wife in Dallas.',
    body: "We'd been dating three months. He was charming, traveled frequently for 'work,' always paid in cash. Something felt off. I ran his number. Verity returned a current marriage — dated 2019 — to a woman in Dallas, Texas. His LinkedIn had him listed as single. I sent her a message. She'd had no idea either.",
    score: 'red',
    tag: 'Active marriage undisclosed',
  },
  {
    initial: 'M.',
    location: 'New York, NY',
    title: 'The address history told the real story.',
    body: "He said he owned his apartment. The address history showed four rentals in three years, one eviction filing in 2022, and a small claims judgment. Not disqualifying on their own — but it changed my questions. We had the real conversation on date four instead of date fourteen.",
    score: 'yellow',
    tag: 'Financial instability pattern',
  },
  {
    initial: 'P.',
    location: 'Chicago, IL',
    title: 'He came up completely clean.',
    body: "I felt guilty running it. He'd been nothing but thoughtful. The report came back green — stable employment at the same company for nine years, clear public record, address history that matched what he'd told me. The guilt turned into something else. I felt like I could finally exhale.",
    score: 'green',
    tag: 'Clean report · peace of mind',
  },
  {
    initial: 'R.',
    location: 'Miami, FL',
    title: 'Sex offender registry. My hands were shaking.',
    body: "He'd found me on Instagram. Wonderful messages, moved quickly to texting, wanted to meet at my apartment. I ran his number before responding. NSOPW returned a match — a conviction from 2017. I blocked him on everything and filed a report with the platform. I don't want to think about if I hadn't looked.",
    score: 'red',
    tag: 'Sex offender registry match',
  },
  {
    initial: 'A.',
    location: 'Seattle, WA',
    title: 'He was dating four women simultaneously.',
    body: "My friend used Verity on the same number two weeks after I did. The phone intelligence showed the number had recently been active across four dating apps — a signal the carrier data surfaces. We compared reports. He'd told each of us he was 'taking things slowly' with 'just one person at a time.' We called him together.",
    score: 'yellow',
    tag: 'Multiple active relationships',
  },
  {
    initial: 'J.',
    location: 'Austin, TX',
    title: 'The VoIP number was the first red flag.',
    body: "He gave me a phone number but it came back as a VoIP line — not a real carrier, no number age, no geographic origin. The identity section returned nothing verifiable. He had no digital footprint at all. I asked about the number directly. He got defensive. That was the answer.",
    score: 'red',
    tag: 'Unverifiable identity',
  },
];

const scoreConfig: Record<string, { label: string; bg: string; color: string }> = {
  green: { label: 'Clear', bg: 'var(--sage-pale)', color: 'var(--sage-deep)' },
  yellow: { label: 'Caution', bg: 'var(--honey-pale)', color: 'var(--honey-deep)' },
  red: { label: 'Flag', bg: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)' },
};

export default function StoriesPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div className="v-section v-max">
        <div style={{ maxWidth: 760, marginBottom: 64 }}>
          <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>Story library</span>
          <h1 className="v-display-lg v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: '0 0 24px' }}>
            Women who looked,{' '}
            <em style={{ color: 'var(--rose)' }}>and what they found.</em>
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
            These are real outcomes from real searches, shared with permission and anonymized.
            Names, locations, and identifying details have been changed. The facts have not.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 28 }}>
          {stories.map((s, i) => {
            const cfg = scoreConfig[s.score];
            return (
              <article key={i} style={{
                background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
                padding: '36px 32px', boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column', gap: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--primary-mist)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18,
                      color: 'var(--primary-deep)',
                    }}>{s.initial}</div>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)' }}>{s.location}</span>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 'var(--r-pill)',
                    background: cfg.bg, color: cfg.color,
                    fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 500, letterSpacing: 0.3,
                  }}>{cfg.label}</span>
                </div>

                <div>
                  <h2 style={{
                    fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400,
                    color: 'var(--dark)', margin: '0 0 14px', lineHeight: 1.2,
                  }}>{s.title}</h2>
                  <p style={{
                    fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)',
                    lineHeight: 1.7, margin: 0, fontWeight: 300,
                  }}>{s.body}</p>
                </div>

                <div style={{
                  marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--gold-pale)',
                  fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--gold-deep)',
                  letterSpacing: 0.3, textTransform: 'uppercase',
                }}>{s.tag}</div>
              </article>
            );
          })}
        </div>

        <div style={{
          marginTop: 72, padding: '48px 40px', background: 'var(--primary-mist)',
          borderRadius: 'var(--r-xl)', textAlign: 'center', maxWidth: 640, margin: '72px auto 0',
        }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, color: 'var(--dark)', margin: '0 0 16px' }}>
            Your story starts with a search.
          </h2>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', lineHeight: 1.6, margin: '0 0 32px', fontWeight: 300 }}>
            Join verified women who trust their instincts — and now have the data to back them up.
          </p>
          <Link href="/verify" style={{
            display: 'inline-block', padding: '16px 36px', borderRadius: 'var(--r-pill)',
            background: 'var(--primary)', color: 'var(--ivory)',
            textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
            boxShadow: 'var(--shadow-pop)',
          }}>
            Start your verification →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
