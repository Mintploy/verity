export function WhatYouKnow() {
  const sections = [
    { l: 'Phone intelligence', d: 'Carrier, line type, VoIP detection, geographic origin, age of number.' },
    { l: 'Identity signals', d: 'Full legal name, age, date of birth — cross-referenced across three sources.' },
    { l: 'Address history', d: 'Last five known addresses, ownership vs. rental, purchase and sale prices, trust holdings.' },
    { l: 'Marital & relationships', d: 'Current marital status, prior marriages, known relatives, close associates.' },
    { l: 'Professional profile', d: 'Employer, title, tenure, estimated income, estimated net worth, LLCs and business registrations.' },
    { l: 'Public record flags', d: 'Sex offender registry, bankruptcy, lawsuits and judgments, evictions, professional licenses, political donations.' },
    { l: 'Social footprint', d: 'Known social handles, presence assessment, inconsistencies across profiles, age discrepancies.' },
    { l: 'Our recommendation', d: "A plain-English score, a short verdict, and the three to five things we'd actually do next, in your shoes." },
  ];

  return (
    <section className="v-section" style={{ background: 'var(--ivory-warm)', position: 'relative' }}>
      <div className="v-max">
        <div className="v-grid-feature">
          <div style={{ position: 'sticky', top: 100 }}>
            <span className="v-eyebrow" style={{ marginBottom: 14, display: 'block' }}>Inside every report</span>
            <h2 className="v-display-lg v-serif" style={{
              fontWeight: 400, color: 'var(--primary-deep)', margin: 0,
            }}>
              Eight chapters, <em style={{ color: 'var(--primary)' }}>one quiet truth.</em>
            </h2>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.6,
              margin: '24px 0 0', maxWidth: 380, fontWeight: 300,
            }}>
              We cross-reference seven independent sources — Whitepages Pro, ATTOM, BeenVerified, Proxycurl, PACER, FEC, NSOPW — and write you the report your brilliant older sister would, if she had access to a PI.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sections.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 28,
                padding: '24px 0', borderTop: '1px solid var(--gold-pale)',
              }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--gold)',
                  fontWeight: 300, width: 32, paddingTop: 4, opacity: 0.7, flexShrink: 0,
                }}>0{i + 1}</div>
                <div>
                  <h3 style={{
                    fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, color: 'var(--primary-deep)',
                    margin: 0, lineHeight: 1.15, letterSpacing: -0.2,
                  }}>{s.l}</h3>
                  <p style={{
                    fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)', lineHeight: 1.6,
                    margin: '8px 0 0', fontWeight: 300, maxWidth: 580,
                  }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
