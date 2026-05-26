'use client';
import { useState, useMemo } from 'react';
import { Nav } from '@/components/nav/Nav';
import { Floret } from '@/components/ui/Floret';
import Link from 'next/link';

// ── Projection models ──────────────────────────────────────────────────────

interface Projection { expected: number; high: number; low: number; }

interface ComparePerson {
  id: string;
  name: string;
  age: number;
  role: string;
  company: string;
  archetype: string;
  initials: string;
  score: 'green' | 'yellow' | 'red';
  current: number;
  risk: number;
  color: string;
  colorDeep: string;
  colorPale: string;
  summary: string;
  notes: Record<number, string>;
  project: (year: number) => Projection;
}

const COMPARE_MEN: ComparePerson[] = [
  {
    id: 'alex', name: 'Alex Pierre', age: 32, role: 'Founder · CEO',
    company: 'Stitch Labs · Seed, raising A', archetype: 'Tech founder',
    initials: 'AP', score: 'yellow', current: 95000, risk: 0.72,
    color: '#E7506C', colorDeep: '#B41E61', colorPale: '#FFE5EE',
    summary: "High variance. Two years of break-even runway, one Series A on the deck. If the A closes and the company exits, trajectory bends sharply upward. If it doesn't, he returns to industry pay — comfortably, but with no founder upside.",
    notes: {
      5: "Year 5 sits right on the A. Closed cleanly: ~$350K cash + meaningful equity. Walked away: $310K in an L6 role somewhere good.",
      10: "A founder who shipped his second round is a materially different bet from one who didn't. Watch year 4 closely.",
      20: "Founder math: 1 in 30 outcomes are life-changing, the other 29 are fine. Expected value is real, but the variance is the entire story.",
    },
    project: (y) => {
      const successProb = 0.28;
      let success: number;
      if (y < 4) success = 95000 * Math.pow(1.04, y);
      else if (y < 8) success = 95000 * Math.pow(1.04, 4) * Math.pow(1.45, y - 4);
      else if (y < 14) success = 95000 * Math.pow(1.04, 4) * Math.pow(1.45, 4) * Math.pow(1.18, y - 8);
      else success = Math.min(25000000, 95000 * Math.pow(1.04, 4) * Math.pow(1.45, 4) * Math.pow(1.18, 6) * Math.pow(1.05, y - 14));
      let failure: number;
      if (y < 4) failure = 95000 * Math.pow(1.05, y);
      else failure = 310000 * Math.pow(1.038, y - 4);
      const expected = success * successProb + failure * (1 - successProb);
      return { expected, high: Math.max(success, failure, expected), low: Math.min(success, failure, expected) };
    },
  },
  {
    id: 'reid', name: 'Reid Whitman', age: 36, role: 'Corporate attorney',
    company: 'Cravath, Swaine & Moore · M&A', archetype: 'BigLaw partner-track',
    initials: 'RW', score: 'green', current: 325000, risk: 0.12,
    color: '#C8A6B4', colorDeep: '#5C2A50', colorPale: '#FFE0DE',
    summary: "Predictable, ceiling-bound. Partner track puts him at $1.1M ± $200K by year 5. Plateau begins around senior partner at year 15. Limited upside above $2.5M unless he opens his own shop.",
    notes: {
      5: "Partner at Cravath or one peer firm: $1.1M ± 200K. Steady, not stratospheric.",
      10: "Senior partner band. Top of his pay scale. The plateau begins asserting itself.",
      20: 'No real upside from here without an entrepreneurial turn.',
    },
    project: (y) => {
      const partnerY = 4, seniorY = 15;
      let expected: number;
      if (y < partnerY) expected = 325000 + (1100000 - 325000) * (y / partnerY);
      else if (y < seniorY) expected = 1100000 + (1900000 - 1100000) * ((y - partnerY) / (seniorY - partnerY));
      else expected = 1900000 * Math.pow(1.006, y - seniorY);
      return { expected, high: expected * 1.18, low: expected * 0.84 };
    },
  },
  {
    id: 'marcus', name: 'Marcus Anderson', age: 41, role: 'Real estate operator',
    company: 'Anderson Holdings LLC', archetype: 'Cyclical operator',
    initials: 'MA', score: 'yellow', current: 260000, risk: 0.40,
    color: '#E9B25C', colorDeep: '#6E4F1D', colorPale: '#F9DCAA',
    summary: "Cyclical. Income tracks the property market — strong in good cycles, soft in down ones. The active 2024 civil suit caps near-term growth. No clear path above $1.5M without scaling the LLC.",
    notes: {
      5: "A 2027–2029 market does most of the work here. Expected: $360K, but the range is wide.",
      10: "If he scales the LLC and weathers two cycles, $700K+ is plausible.",
      20: "Real estate operators in their 60s either own everything or own one thing too long.",
    },
    project: (y) => {
      const base = 260000 + (1150000 - 260000) * Math.min(1, y / 16);
      const cycle = Math.sin(y / 3.2 + 1) * 70000;
      const expected = Math.max(180000, base + cycle);
      return { expected, high: expected * 1.75, low: expected * 0.55 };
    },
  },
  {
    id: 'daniel', name: 'Daniel Chen', age: 34, role: 'Senior Staff Engineer',
    company: 'Stripe · Infrastructure', archetype: 'Senior IC engineer',
    initials: 'DC', score: 'green', current: 375000, risk: 0.08,
    color: '#87AE7E', colorDeep: '#2F4A2C', colorPale: '#DEECD6',
    summary: "Stable, capped. IC engineer ladders top out around Distinguished Engineer at ~$1.1M. Strong floor, modest ceiling. Liquidity comes from RSUs. The boring number that compounds.",
    notes: {
      5: "Principal Engineer band: $620K–$780K. Quiet, dependable growth.",
      10: "Distinguished Engineer at $1M+, or a CTO pivot. The plateau asserts around year 12.",
      20: "Without a founder turn or executive pivot, this is the ceiling. The stability is the feature.",
    },
    project: (y) => {
      const expected = Math.min(1100000, 375000 * Math.pow(1.075, Math.min(y, 14))) * Math.pow(1.005, Math.max(0, y - 14));
      return { expected, high: expected * 1.14, low: expected * 0.90 };
    },
  },
];

function fmtMoney(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n);
}

function logY(value: number): number {
  const minLog = Math.log10(50000);
  const maxLog = Math.log10(25000000);
  const v = Math.max(50000, Math.min(25000000, value));
  return (Math.log10(v) - minLog) / (maxLog - minLog);
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ComparePage() {
  const [year, setYear] = useState(5);
  const [expanded, setExpanded] = useState<string | null>(null);

  const ranked = useMemo(() => {
    return [...COMPARE_MEN]
      .map(p => ({ ...p, proj: p.project(year) }))
      .sort((a, b) => b.proj.expected - a.proj.expected);
  }, [year]);

  const nearestNote = (notes: Record<number, string>, y: number): string => {
    const keys = Object.keys(notes).map(Number).sort((a, b) => Math.abs(a - y) - Math.abs(b - y));
    return notes[keys[0]] ?? '';
  };

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1480, margin: '0 auto', padding: '40px 56px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 36 }}>
          <div style={{ maxWidth: 720 }}>
            <Link href="/search" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--plum-soft)',
              textDecoration: 'none', marginBottom: 14,
            }}>
              ← Back to search
            </Link>
            <div className="v-eyebrow" style={{ marginBottom: 12 }}>Your shortlist · {ranked.length} men · the honest math</div>
            <h1 style={{
              fontFamily: 'var(--serif)', fontSize: 64, lineHeight: 1.0, fontWeight: 400,
              color: 'var(--plum)', margin: 0, letterSpacing: -0.6,
            }}>
              Where each of them <em style={{ color: 'var(--rose)' }}>actually</em> lands.
            </h1>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--plum-soft)', lineHeight: 1.6,
              margin: '18px 0 0', maxWidth: 580, fontWeight: 300,
            }}>
              Each man modeled on his archetype — tech founder versus partner-track attorney versus
              cyclical operator versus capped IC. Risk-adjusted. Confidence bands shown. Slide the year.
            </p>
          </div>
          <Floret size={48} color="var(--blush-deep)" center="var(--ivory)" />
        </div>

        {/* Year slider */}
        <div style={{
          padding: '24px 28px', borderRadius: 'var(--r-xl)',
          background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', marginBottom: 32,
          display: 'grid', gridTemplateColumns: '300px 1fr', gap: 36, alignItems: 'center',
        }}>
          <div>
            <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>Horizon</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, lineHeight: 1 }}>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 88, lineHeight: 0.9, fontWeight: 400,
                color: 'var(--plum)', letterSpacing: -2, fontVariantNumeric: 'tabular-nums',
              }}>{year}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--rose)', fontWeight: 300, whiteSpace: 'nowrap' }}>
                  {year === 1 ? 'year out' : 'years out'}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
                  {2026 + year}
                </div>
              </div>
            </div>
          </div>

          <div>
            <input
              type="range" min={1} max={50} value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', height: 6, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)' }}>
              {[1, 5, 10, 20, 30, 50].map(y => (
                <button key={y} onClick={() => setYear(y)} style={{
                  border: 'none', cursor: 'pointer', padding: '4px 8px',
                  fontFamily: 'var(--sans)', fontSize: 11, borderRadius: 6,
                  color: year === y ? 'var(--primary)' : 'var(--mauve-deep)',
                  background: year === y ? 'var(--primary-mist)' : 'transparent',
                } as React.CSSProperties}>{y}y</button>
              ))}
            </div>
          </div>
        </div>

        {/* Rank cards + chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 32, alignItems: 'start' }}>
          {/* Rank cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ranked.map((person, i) => {
              const isExpanded = expanded === person.id;
              const note = nearestNote(person.notes, year);
              return (
                <div
                  key={person.id}
                  onClick={() => setExpanded(isExpanded ? null : person.id)}
                  style={{
                    padding: '20px 22px', borderRadius: 'var(--r-lg)',
                    background: isExpanded ? 'var(--pearl)' : 'var(--pearl)',
                    boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    cursor: 'pointer', transition: 'box-shadow .2s',
                    borderLeft: `3px solid ${person.color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: person.colorPale,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
                      color: person.colorDeep, flexShrink: 0,
                    }}>{person.initials}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{
                          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 32,
                          color: 'var(--rose)', fontWeight: 300, lineHeight: 1,
                        }}>#{i + 1}</span>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--plum)' }}>{person.name}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--plum-soft)', marginTop: 2 }}>
                        {person.role} · {person.archetype}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--plum)', fontWeight: 400, lineHeight: 1 }}>
                        {fmtMoney(person.proj.expected)}
                      </div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: 'var(--mauve-deep)', marginTop: 3, letterSpacing: 0.2 }}>
                        {fmtMoney(person.proj.low)} – {fmtMoney(person.proj.high)}
                      </div>
                    </div>
                  </div>

                  {/* Mini sparkline */}
                  <MiniSparkline person={person} year={year} />

                  {isExpanded && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--ivory-deep)' }}>
                      <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--plum)', lineHeight: 1.6, margin: '0 0 12px', fontWeight: 300 }}>
                        {person.summary}
                      </p>
                      {note && (
                        <div style={{
                          padding: '12px 14px', background: person.colorPale,
                          borderRadius: 'var(--r-md)',
                          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5,
                          color: person.colorDeep, lineHeight: 1.5,
                        }}>
                          Year {year}: {note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{
              padding: '16px 18px', background: 'var(--blush-pale)', borderRadius: 'var(--r-lg)',
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--wine)', lineHeight: 1.5,
            }}>
              "Income is one signal. The right partner isn't always the highest projection —
              but you deserve to make the call with both eyes open."
              <div style={{ fontFamily: 'var(--sans)', fontStyle: 'normal', fontSize: 10, color: 'var(--wine)', opacity: 0.7, marginTop: 8, letterSpacing: 0.3 }}>
                VERITY'S NOTE ON COMPARE
              </div>
            </div>
          </div>

          {/* Trajectory chart */}
          <div style={{ position: 'sticky', top: 92 }}>
            <TrajectoryChart men={COMPARE_MEN} year={year} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ person, year }: { person: ComparePerson; year: number }) {
  const points = Array.from({ length: 30 }, (_, i) => {
    const y = i + 1;
    const proj = person.project(y);
    return { y, expected: proj.expected };
  });

  const maxVal = Math.max(...points.map(p => p.expected));
  const minVal = Math.min(...points.map(p => p.expected));
  const range = maxVal - minVal || 1;

  const w = 340, h = 36;
  const toX = (y: number) => ((y - 1) / 29) * w;
  const toY = (v: number) => h - ((v - minVal) / range) * h;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.y)} ${toY(p.expected)}`).join(' ');
  const currentX = toX(Math.min(year, 30));
  const currentIdx = Math.min(year - 1, 29);
  const currentY = toY(points[currentIdx].expected);

  return (
    <div style={{ marginTop: 12 }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 4}`} style={{ overflow: 'visible' }}>
        <path d={pathD} stroke={person.color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        <circle cx={currentX} cy={currentY} r={4} fill={person.color} />
      </svg>
    </div>
  );
}

function TrajectoryChart({ men, year }: { men: ComparePerson[]; year: number }) {
  const w = 580, h = 340;
  const paddingL = 56, paddingR = 20, paddingT = 20, paddingB = 40;
  const chartW = w - paddingL - paddingR;
  const chartH = h - paddingT - paddingB;
  const maxYears = 50;

  const toX = (y: number) => paddingL + (y / maxYears) * chartW;
  const toChartY = (v: number) => paddingT + chartH - logY(v) * chartH;

  const yAxisTicks = [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000];
  const yAxisLabels: Record<number, string> = {
    50000: '$50K', 100000: '$100K', 250000: '$250K', 500000: '$500K',
    1000000: '$1M', 2500000: '$2.5M', 5000000: '$5M', 10000000: '$10M', 25000000: '$25M',
  };

  const allPoints = men.map(person => ({
    person,
    points: Array.from({ length: maxYears + 1 }, (_, i) => ({ y: i, proj: person.project(i || 0.01) })),
  }));

  return (
    <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '28px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>Income trajectory · log scale · 80% confidence bands</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {men.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: m.color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--plum-soft)' }}>{m.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {/* Y-axis gridlines */}
        {yAxisTicks.map(tick => {
          const cy = toChartY(tick);
          return (
            <g key={tick}>
              <line x1={paddingL} y1={cy} x2={w - paddingR} y2={cy} stroke="var(--ivory-deep)" strokeWidth={0.8} />
              <text x={paddingL - 6} y={cy + 4} textAnchor="end" fontSize={9} fill="var(--mauve-deep)" fontFamily="Outfit, sans-serif">{yAxisLabels[tick]}</text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {[0, 10, 20, 30, 40, 50].map(y => (
          <text key={y} x={toX(y)} y={h - paddingB + 16} textAnchor="middle" fontSize={10} fill="var(--mauve-deep)" fontFamily="Outfit, sans-serif">
            {y === 0 ? 'now' : `${y}y`}
          </text>
        ))}

        {/* Confidence bands */}
        {allPoints.map(({ person, points }) => {
          const bandPath = [
            points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.y)} ${toChartY(p.proj.high)}`).join(' '),
            points.slice().reverse().map((p, i) => `${i === 0 ? 'L' : 'L'} ${toX(p.y)} ${toChartY(p.proj.low)}`).join(' '),
            'Z'
          ].join(' ');
          return <path key={`band-${person.id}`} d={bandPath} fill={person.color} opacity={0.1} />;
        })}

        {/* Expected lines */}
        {allPoints.map(({ person, points }) => {
          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.y)} ${toChartY(p.proj.expected)}`).join(' ');
          return <path key={`line-${person.id}`} d={linePath} stroke={person.color} strokeWidth={2} fill="none" strokeLinecap="round" />;
        })}

        {/* Current year marker */}
        <line x1={toX(year)} y1={paddingT} x2={toX(year)} y2={h - paddingB} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />

        {/* Dots at current year */}
        {allPoints.map(({ person, points }) => {
          const idx = Math.min(year, maxYears);
          const proj = person.project(idx);
          return (
            <circle
              key={`dot-${person.id}`}
              cx={toX(idx)} cy={toChartY(proj.expected)}
              r={5} fill={person.color}
              stroke="var(--pearl)" strokeWidth={2}
            />
          );
        })}

        {/* Year label */}
        <text x={toX(year)} y={paddingT - 6} textAnchor="middle" fontSize={10} fill="var(--primary)" fontFamily="Outfit, sans-serif" fontWeight="500">
          {year}y
        </text>
      </svg>
    </div>
  );
}
