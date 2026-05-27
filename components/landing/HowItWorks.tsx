import { Floret } from '@/components/ui/Floret';

export function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Verify yourself, once',
      body: 'A 90-second ID check (Stripe Identity). Verity is exclusively for women. The gate exists so the room stays safe.',
      accent: 'var(--gold-pale)',
    },
    {
      num: '02',
      title: 'Drop in a number',
      body: "His phone is the only thing we truly need. A name sharpens the picture. He will never know you searched.",
      accent: 'var(--primary-pale)',
    },
    {
      num: '03',
      title: 'Read the room',
      body: "A score, a verdict, and seven sections of cross-referenced public record. Plus what we'd do next, in your shoes.",
      accent: 'var(--champagne)',
    },
  ];

  return (
    <section id="how-it-works" className="v-section" style={{ background: 'var(--ivory)', position: 'relative' }}>
      <div className="v-max">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 60, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <span className="v-eyebrow" style={{ marginBottom: 14, display: 'block' }}>How it works</span>
            <h2 className="v-display-lg v-serif" style={{
              fontWeight: 400, color: 'var(--primary-deep)', margin: 0, maxWidth: 700,
            }}>
              Three steps, ninety seconds,{' '}
              <em style={{ color: 'var(--primary)' }}>peace of mind</em> for as long as you'd like it.
            </h2>
          </div>
          <Floret size={48} color="var(--blush-deep)" center="var(--ivory)" />
        </div>

        <div className="v-grid-3">
          {steps.map((s, i) => (
            <div key={i} style={{
              padding: '40px 32px 36px', borderRadius: 'var(--r-xl)',
              background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
                background: `radial-gradient(circle, ${s.accent} 0%, transparent 70%)`,
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 64, color: 'var(--gold)',
                  fontWeight: 300, lineHeight: 1, marginBottom: 16, opacity: 0.55,
                }}>{s.num}</div>
                <h3 style={{
                  fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, color: 'var(--primary-deep)',
                  margin: 0, lineHeight: 1.1, letterSpacing: -0.3,
                }}>{s.title}</h3>
                <p style={{
                  fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)', lineHeight: 1.6,
                  margin: '14px 0 0', fontWeight: 300,
                }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
