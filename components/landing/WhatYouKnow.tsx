export function WhatYouKnow() {
  const sections = [
    { l: 'Phone intelligence', d: 'Carrier, line type, VoIP detection, and whether the line is still connected.' },
    { l: 'Identity signals', d: 'Full legal name, age, and the aliases and alternate spellings attached to the same record.' },
    { l: 'Address history', d: 'Known addresses with the dates each was reported and the county, whether each looks like a home or an office, and the property record behind his current address.' },
    { l: 'Marital & relationships', d: 'Marriage and divorce records on file, known relatives and close associates. Any relative can be searched in one tap.' },
    { l: 'Professional profile', d: 'Employer and title where the record carries them, professional licences, and the business entities registered to his name.' },
    { l: 'Public record flags', d: 'Sex offender registry and criminal records, sanctions screening, bankruptcies, evictions and pre-foreclosure, judgments and liens, federal lawsuits, political donations.' },
    { l: 'Social footprint', d: 'Public profiles and email addresses that appear on the record, stated as that and nothing more.' },
    { l: 'Our recommendation', d: "A plain-English score, a short verdict that names the reason it landed there, and the three to five things we'd actually do next, in your shoes." },
  ];

  return (
    <section id="what-youll-know" className="v-section" style={{ background: 'var(--ivory-warm)', position: 'relative' }}>
      <div className="v-max">
        <div className="v-grid-feature">
          <div className="v-feature-sticky">
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
              We cross-reference three independent sources, Enformion, CourtListener and the FEC, and write you the report your brilliant older sister would, if she had access to a PI.
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
