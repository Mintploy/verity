'use client';

type Card =
  | { type: 'score'; score: 'green' | 'yellow' | 'red'; label: string; sub: string }
  | { type: 'data'; label: string; val: string }
  | { type: 'tag'; text: string; tone?: 'clear' | 'flag' }
  | { type: 'quote'; text: string; attr: string };

const col1: Card[] = [
  { type: 'score', score: 'green', label: 'Green light', sub: 'Proceed with ease.' },
  { type: 'data', label: 'Address history', val: '4 known addresses · Austin, TX current' },
  { type: 'tag', text: 'No criminal record', tone: 'clear' },
  { type: 'score', score: 'yellow', label: 'Soft yellow', sub: 'A few things to weigh.' },
  { type: 'data', label: 'Phone carrier', val: 'T-Mobile · mobile line · 6 years' },
  { type: 'tag', text: 'Sex offender registry: clear', tone: 'clear' },
  { type: 'quote', text: 'Finally felt safe meeting someone from Hinge.', attr: 'Sofia R. · 29 · LA' },
  { type: 'data', label: 'Identity', val: 'Cross-referenced · 3 sources confirmed' },
  { type: 'tag', text: 'No eviction history', tone: 'clear' },
];

const col2: Card[] = [
  { type: 'data', label: 'Marital status', val: 'Divorced · 2021 · 1 prior marriage' },
  { type: 'score', score: 'red', label: 'Deep rose', sub: "We'd skip this one." },
  { type: 'tag', text: 'Bankruptcy filed · 2020', tone: 'flag' },
  { type: 'quote', text: 'He had an active warrant. I nearly went on that date.', attr: 'Priya M. · 31 · Chicago' },
  { type: 'data', label: 'Employer', val: 'Accenture · Senior Manager · est. $140k' },
  { type: 'tag', text: 'VoIP secondary line detected', tone: 'flag' },
  { type: 'data', label: 'Sources checked', val: 'Whitepages · ATTOM · PACER · FEC · NSOPW' },
  { type: 'score', score: 'green', label: 'Green light', sub: 'Proceed with ease.' },
  { type: 'tag', text: 'Age verified across profiles', tone: 'clear' },
];

const col3: Card[] = [
  { type: 'tag', text: 'Identity verified · 3 sources', tone: 'clear' },
  { type: 'data', label: 'Net worth estimate', val: '$340k–$480k · property & assets' },
  { type: 'score', score: 'yellow', label: 'Soft yellow', sub: 'Proceed with care.' },
  { type: 'quote', text: 'I use it before every first date. Non-negotiable.', attr: 'Aisha T. · 26 · NYC' },
  { type: 'data', label: 'Public records', val: '1 civil suit open · 2023 · Los Angeles' },
  { type: 'tag', text: '47,232 women already verified', tone: 'clear' },
  { type: 'data', label: 'Social footprint', val: 'Age discrepancy found on X / Instagram' },
  { type: 'score', score: 'red', label: 'Deep rose', sub: "We'd sit this one out." },
  { type: 'tag', text: 'Report generated in 14 seconds', tone: 'clear' },
];

const SCORE_CONFIG = {
  green:  { bg: 'var(--sage-pale)',     dot: 'var(--sage)',     text: 'var(--sage-deep)',     deep: 'var(--sage-deep)' },
  yellow: { bg: 'var(--honey-pale)',    dot: 'var(--honey)',    text: 'var(--honey-deep)',    deep: 'var(--honey-deep)' },
  red:    { bg: 'var(--deeprose-pale)', dot: 'var(--deeprose)', text: 'var(--deeprose-deep)', deep: 'var(--deeprose-deep)' },
};

function ScoreCard({ score, label, sub }: Extract<Card, { type: 'score' }>) {
  const c = SCORE_CONFIG[score];
  return (
    <div style={{
      padding: '18px 20px', borderRadius: 'var(--r-lg)',
      background: c.bg, border: `1px solid ${c.dot}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: c.text, letterSpacing: 0.3, textTransform: 'uppercase' as const }}>{label}</div>
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: c.deep, lineHeight: 1.15 }}>
        "{sub}"
      </div>
    </div>
  );
}

function DataCard({ label, val }: Extract<Card, { type: 'data' }>) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 'var(--r-lg)',
      background: 'var(--pearl)', border: '1px solid var(--gold-pale)',
    }}>
      <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.45, fontWeight: 400 }}>{val}</div>
    </div>
  );
}

function TagCard({ text, tone = 'clear' }: Extract<Card, { type: 'tag' }>) {
  const flag = tone === 'flag';
  return (
    <div style={{
      padding: '13px 16px', borderRadius: 'var(--r-lg)',
      background: flag ? 'var(--honey-pale)' : 'var(--ivory-warm)',
      border: `1px solid ${flag ? 'var(--honey)' : 'var(--gold-pale)'}22`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: flag ? 'var(--honey-deep)' : 'var(--sage)',
      }} />
      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: flag ? 'var(--honey-deep)' : 'var(--dark)', fontWeight: flag ? 500 : 400 }}>
        {text}
      </div>
    </div>
  );
}

function QuoteCard({ text, attr }: Extract<Card, { type: 'quote' }>) {
  return (
    <div style={{
      padding: '18px 20px', borderRadius: 'var(--r-lg)',
      background: 'linear-gradient(135deg, var(--blush-pale) 0%, var(--ivory-warm) 100%)',
      border: '1px solid var(--primary-pale)',
    }}>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.55, marginBottom: 10 }}>
        "{text}"
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', letterSpacing: 0.3, textTransform: 'uppercase' as const }}>{attr}</div>
    </div>
  );
}

function renderCard(card: Card, i: number) {
  const key = i;
  if (card.type === 'score') return <ScoreCard key={key} {...card} />;
  if (card.type === 'data')  return <DataCard  key={key} {...card} />;
  if (card.type === 'tag')   return <TagCard   key={key} {...card} />;
  if (card.type === 'quote') return <QuoteCard key={key} {...card} />;
  return null;
}

function Column({ cards, direction, speed }: { cards: Card[]; direction: 'up' | 'down'; speed: number }) {
  const doubled = [...cards, ...cards];
  const animName = direction === 'up' ? 'marqueeUp' : 'marqueeDown';
  return (
    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        animation: `${animName} ${speed}s linear infinite`,
        willChange: 'transform',
      }}>
        {doubled.map((card, i) => renderCard(card, i))}
      </div>
    </div>
  );
}

export function MarqueeColumns() {
  return (
    <section style={{ background: 'var(--dark)', position: 'relative', overflow: 'hidden', padding: 'clamp(48px, 6vw, 80px) 0' }}>
      {/* Radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(180,30,97,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Heading */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, marginBottom: 'clamp(32px, 4vw, 56px)', padding: '0 24px' }}>
        <div className="v-eyebrow" style={{ color: 'var(--mauve)', marginBottom: 12 }}>What we surface</div>
        <h2 style={{
          fontFamily: 'var(--serif)', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400,
          color: 'var(--ivory)', margin: 0, lineHeight: 1.1, letterSpacing: -0.3,
        }}>
          Every angle, <em style={{ color: 'var(--primary)' }}>all at once.</em>
        </h2>
      </div>

      {/* Columns */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Fade masks */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, var(--dark), transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, var(--dark), transparent)', zIndex: 2, pointerEvents: 'none' }} />

        <div style={{
          display: 'flex', gap: 12,
          height: 'clamp(380px, 45vw, 520px)',
          overflow: 'hidden',
          padding: '0 clamp(16px, 4vw, 48px)',
        }}>
          <Column cards={col1} direction="up"   speed={34} />
          <Column cards={col2} direction="down" speed={28} />
          <Column cards={col3} direction="up"   speed={38} />
        </div>
      </div>

      <style>{`
        @keyframes marqueeUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes marqueeDown {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
