'use client';
import { useState, useMemo, useEffect } from 'react';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';
import { Floret } from '@/components/ui/Floret';
import { Sparkle } from '@/components/ui/Sparkle';
import Link from 'next/link';
import { Report } from '@/lib/types';

// ── Types & models ─────────────────────────────────────────────────────────

interface Projection { expected: number; high: number; low: number; }

interface ComparePerson {
  id: string; name: string; age: number; role: string; company: string;
  archetype: string; initials: string; score: 'green' | 'yellow' | 'red';
  current: number; risk: number; color: string; colorDeep: string; colorPale: string;
  summary: string; notes: Record<number, string>;
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
      const sp = 0.28;
      let s = y < 4 ? 95000 * Math.pow(1.04, y) : y < 8 ? 95000 * Math.pow(1.04, 4) * Math.pow(1.45, y - 4)
        : y < 14 ? 95000 * Math.pow(1.04, 4) * Math.pow(1.45, 4) * Math.pow(1.18, y - 8)
        : Math.min(25000000, 95000 * Math.pow(1.04, 4) * Math.pow(1.45, 4) * Math.pow(1.18, 6) * Math.pow(1.05, y - 14));
      let f = y < 4 ? 95000 * Math.pow(1.05, y) : 310000 * Math.pow(1.038, y - 4);
      const expected = s * sp + f * (1 - sp);
      return { expected, high: Math.max(s, f, expected), low: Math.min(s, f, expected) };
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
      20: "No real upside from here without an entrepreneurial turn.",
    },
    project: (y) => {
      const pY = 4, sY = 15;
      let expected = y < pY ? 325000 + (1100000 - 325000) * (y / pY)
        : y < sY ? 1100000 + (1900000 - 1100000) * ((y - pY) / (sY - pY))
        : 1900000 * Math.pow(1.006, y - sY);
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
      const expected = Math.max(180000, base + Math.sin(y / 3.2 + 1) * 70000);
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
  const minLog = Math.log10(50000), maxLog = Math.log10(25000000);
  return (Math.log10(Math.max(50000, Math.min(25000000, value))) - minLog) / (maxLog - minLog);
}

// ── Session data ───────────────────────────────────────────────────────────

function parseIncome(s: string): number {
  const nums = s.replace(/[^0-9]/g, ' ').trim().split(/\s+/).map(Number).filter(n => n > 1000);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 80000;
}

const SCORE_COLORS: Record<string, { color: string; colorDeep: string; colorPale: string }> = {
  green: { color: '#87AE7E', colorDeep: '#2F4A2C', colorPale: '#DEECD6' },
  yellow: { color: '#E9B25C', colorDeep: '#6E4F1D', colorPale: '#F9DCAA' },
  red: { color: '#E7506C', colorDeep: '#B41E61', colorPale: '#FFE5EE' },
};

function reportToComparePerson(report: Report): ComparePerson {
  const colors = SCORE_COLORS[report.score] ?? SCORE_COLORS.yellow;
  const current = parseIncome(report.professional.income);
  const risk = ({ green: 0.08, yellow: 0.40, red: 0.72 } as Record<string, number>)[report.score] ?? 0.4;
  const growth = ({ green: 0.065, yellow: 0.04, red: 0.02 } as Record<string, number>)[report.score] ?? 0.04;
  const parts = report.subject.name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : report.subject.name.slice(0, 2).toUpperCase();
  return {
    id: report.searchId, name: report.subject.name, age: report.subject.age,
    role: report.professional.title, company: report.professional.company,
    archetype: report.professional.title, initials, score: report.score, current, risk,
    ...colors, summary: report.summary,
    notes: { 5: report.nextSteps[0] ?? '', 10: report.nextSteps[1] ?? '', 20: report.nextSteps[2] ?? '' },
    project: (y) => {
      const expected = current * Math.pow(1 + growth, y);
      return { expected, high: expected * (1 + risk * 0.5), low: expected * (1 - risk * 0.4) };
    },
  };
}

function loadSessionReports(): ComparePerson[] {
  if (typeof window === 'undefined') return [];
  const people: ComparePerson[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('report-')) {
      try { people.push(reportToComparePerson(JSON.parse(sessionStorage.getItem(key)!))); } catch {}
    }
  }
  return people;
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [year, setYear] = useState(5);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [people, setPeople] = useState<ComparePerson[]>(COMPARE_MEN);
  const [usingRealData, setUsingRealData] = useState(false);

  useEffect(() => {
    const fromSession = loadSessionReports();
    if (fromSession.length >= 2) { setPeople(fromSession); setUsingRealData(true); }
  }, []);

  const ranked = useMemo(() =>
    [...people].map(p => ({ ...p, proj: p.project(year) })).sort((a, b) => b.proj.expected - a.proj.expected),
    [year, people]
  );

  const avgAge = Math.round(people.reduce((a, p) => a + p.age, 0) / people.length);

  const nearestNote = (notes: Record<number, string>, y: number) => {
    const keys = Object.keys(notes).map(Number).sort((a, b) => Math.abs(a - y) - Math.abs(b - y));
    return notes[keys[0]] ?? '';
  };

  const leader = ranked[0];
  const topNote = nearestNote(leader?.notes ?? {}, year);
  const highestCeiling = [...ranked].sort((a, b) => b.proj.high - a.proj.high)[0];

  const verityRead = topNote
    ? `"${topNote}"`
    : `"At year ${year}, ${leader?.name.split(' ')[0]} leads — but the gap is ${
        (leader?.risk ?? 0) > 0.3
          ? 'largely a function of variance, not certainty. Watch the bands, not just the lines.'
          : 'driven by consistent compounding. The predictable path wins more often than it should.'
      }"`;

  const YEAR_MARKS = [1, 3, 5, 10, 15, 20, 30, 40, 50];

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1480, margin: '0 auto', padding: 'clamp(20px, 4vw, 56px)' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 36 }}>
          <div style={{ maxWidth: 720 }}>
            <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', textDecoration: 'none', marginBottom: 14 }}>
              ← Back to search
            </Link>
            {!usingRealData && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--gold-pale)', borderRadius: 'var(--r-pill)', marginBottom: 14, marginLeft: 12, fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--gold-deep)' }}>
                Sample data — run searches to compare real men
              </div>
            )}
            <h1 className="v-display-lg v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: 0 }}>
              Where each of them <em style={{ color: 'var(--rose)' }}>actually</em> lands.
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.6, margin: '18px 0 0', maxWidth: 560, fontWeight: 300 }}>
              Each man modeled on his archetype — tech founder versus partner-track attorney versus
              cyclical operator versus capped IC. Risk-adjusted. Confidence bands shown. Slide the year.
            </p>
          </div>
          <Floret size={48} color="var(--blush-deep)" center="var(--ivory)" />
        </div>

        {/* ── Year slider ── */}
        <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-sm)', marginBottom: 32, padding: '24px 28px' }}>
          <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 16 }}>Horizon</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>
            {/* Big number */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, lineHeight: 1 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(64px,10vw,88px)', lineHeight: 0.9, fontWeight: 400, color: 'var(--dark)', letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>{year}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--gold)', fontWeight: 300, whiteSpace: 'nowrap' }}>
                    {year === 1 ? 'year out' : 'years out'}
                  </span>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
                    he'll be ~{avgAge + year} on avg · {2026 + year}
                  </span>
                </div>
              </div>
            </div>

            {/* Slider track */}
            <div style={{ flex: 1, minWidth: 200, paddingTop: 8 }}>
              <input
                type="range" min={1} max={50} value={year}
                onChange={e => setYear(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', height: 6, cursor: 'pointer', display: 'block' }}
              />
              {/* Year markers */}
              <div style={{ position: 'relative', height: 28, marginTop: 4 }}>
                {YEAR_MARKS.map(y => (
                  <button key={y} onClick={() => setYear(y)} style={{
                    position: 'absolute',
                    left: `${((y - 1) / 49) * 100}%`,
                    transform: 'translateX(-50%)',
                    border: 'none', background: 'none', cursor: 'pointer',
                    fontFamily: 'var(--sans)', fontSize: 11, padding: '4px 2px',
                    color: year === y ? 'var(--primary)' : 'var(--mauve-deep)',
                    fontWeight: year === y ? 600 : 300,
                    letterSpacing: 0.2,
                    whiteSpace: 'nowrap',
                  }}>{y}y</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Rank cards + chart ── */}
        <div className="v-grid-compare">
          {/* Left: rank cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 14, letterSpacing: 0.25 }}>
              Ranked · Expected income at year {year}
            </div>

            {ranked.map((person, i) => {
              const isExpanded = expanded === person.id;
              const note = nearestNote(person.notes, year);
              const rangePercent = Math.round((person.proj.high - person.proj.low) / (2 * person.proj.expected) * 100);
              return (
                <div key={person.id} style={{ marginBottom: 10 }}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : person.id)}
                    style={{
                      padding: '18px 20px', borderRadius: 'var(--r-lg)',
                      background: 'var(--pearl)',
                      boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                      cursor: 'pointer', transition: 'box-shadow .2s',
                      borderLeft: `3px solid ${person.color}`,
                    }}
                  >
                    {/* Top row: rank | avatar | name | amount */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 40, color: 'var(--gold)', fontWeight: 300, lineHeight: 1, opacity: 0.65, minWidth: 28, textAlign: 'center' }}>
                        {i + 1}
                      </span>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: person.colorPale, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: person.colorDeep, flexShrink: 0 }}>
                        {person.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--dark)', lineHeight: 1.2 }}>{person.name}</div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--dark-soft)', marginTop: 2 }}>{person.role} · <em style={{ fontStyle: 'italic', color: 'var(--mauve-deep)' }}>{person.archetype}</em></div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)', fontWeight: 400, lineHeight: 1 }}>
                          {fmtMoney(person.proj.expected)}
                        </div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--mauve-deep)', marginTop: 3, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                          ±{rangePercent}% range
                        </div>
                      </div>
                    </div>

                    {/* Sparkline */}
                    <MiniSparkline person={person} year={year} />

                    {/* Verity's Read toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ivory-deep)' }}>
                      <span className="v-eyebrow" style={{ fontSize: 9, color: 'var(--gold-deep)' }}>Verity's read</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--mauve-deep)' }}>
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.65, margin: '0 0 12px', fontWeight: 300 }}>{person.summary}</p>
                        {note && (
                          <div style={{ padding: '12px 14px', background: person.colorPale, borderRadius: 'var(--r-md)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: person.colorDeep, lineHeight: 1.5 }}>
                            Year {year}: {note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: chart + verity's read */}
          <div style={{ position: 'sticky', top: 92, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TrajectoryChart men={people} year={year} />

            {/* Verity's Read panel */}
            <div style={{ background: 'var(--primary-deep)', borderRadius: 'var(--r-xl)', padding: '28px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Sparkle size={11} color="var(--gold)" />
                <span className="v-eyebrow" style={{ fontSize: 10, color: 'var(--gold)' }}>Verity's read</span>
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ivory)', lineHeight: 1.55, margin: '0 0 24px', fontWeight: 300 }}>
                {verityRead}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div className="v-eyebrow" style={{ fontSize: 9, color: 'var(--gold-pale)', marginBottom: 6 }}>Highest expected</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ivory)', fontWeight: 400, lineHeight: 1 }}>{fmtMoney(leader?.proj.expected ?? 0)}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve)', marginTop: 4 }}>{leader?.name}</div>
                </div>
                <div>
                  <div className="v-eyebrow" style={{ fontSize: 9, color: 'var(--gold-pale)', marginBottom: 6 }}>Highest ceiling</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--ivory)', fontWeight: 400, lineHeight: 1 }}>{fmtMoney(highestCeiling?.proj.high ?? 0)}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve)', marginTop: 4 }}>{highestCeiling?.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────

function MiniSparkline({ person, year }: { person: ComparePerson; year: number }) {
  const points = Array.from({ length: 30 }, (_, i) => ({ y: i + 1, expected: person.project(i + 1).expected }));
  const maxVal = Math.max(...points.map(p => p.expected));
  const minVal = Math.min(...points.map(p => p.expected));
  const range = maxVal - minVal || 1;
  const w = 340, h = 36;
  const toX = (y: number) => ((y - 1) / 29) * w;
  const toY = (v: number) => h - ((v - minVal) / range) * h;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.y).toFixed(1)} ${toY(p.expected).toFixed(1)}`).join(' ');
  const cx = toX(Math.min(year, 30));
  const cy = toY(points[Math.min(year - 1, 29)].expected);
  return (
    <div style={{ marginTop: 12 }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 4}`} style={{ overflow: 'visible' }}>
        <path d={pathD} stroke={person.color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        <circle cx={cx} cy={cy} r={4} fill={person.color} />
      </svg>
    </div>
  );
}

// ── Trajectory chart ───────────────────────────────────────────────────────

function TrajectoryChart({ men, year }: { men: ComparePerson[]; year: number }) {
  const w = 560, h = 320;
  const pL = 52, pR = 16, pT = 16, pB = 36;
  const cW = w - pL - pR, cH = h - pT - pB;
  const maxYears = 50;
  const toX = (y: number) => pL + (y / maxYears) * cW;
  const toY = (v: number) => pT + cH - logY(v) * cH;

  const ticks = [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000];
  const tickLabels: Record<number, string> = {
    50000: '$50K', 100000: '$100K', 250000: '$250K', 500000: '$500K',
    1000000: '$1M', 2500000: '$2.5M', 5000000: '$5M', 10000000: '$10M', 25000000: '$25M',
  };

  const allPoints = men.map(person => ({
    person,
    points: Array.from({ length: maxYears + 1 }, (_, i) => ({ y: i, proj: person.project(i || 0.01) })),
  }));

  return (
    <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '22px 20px', boxShadow: 'var(--shadow-sm)' }}>
      {/* Chart header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="v-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>50-year trajectories</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.1 }}>
            Side by side, <em style={{ color: 'var(--rose)' }}>compounded.</em>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {men.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
              <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--dark-soft)' }}>{m.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {ticks.map(tick => {
          const cy = toY(tick);
          return (
            <g key={tick}>
              <line x1={pL} y1={cy} x2={w - pR} y2={cy} stroke="var(--ivory-deep)" strokeWidth={0.7} />
              <text x={pL - 5} y={cy + 3.5} textAnchor="end" fontSize={8.5} fill="var(--mauve-deep)" fontFamily="Outfit, sans-serif">{tickLabels[tick]}</text>
            </g>
          );
        })}
        {[0, 10, 20, 30, 40, 50].map(y => (
          <text key={y} x={toX(y)} y={h - pB + 14} textAnchor="middle" fontSize={9.5} fill="var(--mauve-deep)" fontFamily="Outfit, sans-serif">
            {y === 0 ? 'now' : `${y}y`}
          </text>
        ))}
        {allPoints.map(({ person, points }) => {
          const band = [
            points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.y).toFixed(1)} ${toY(p.proj.high).toFixed(1)}`).join(' '),
            points.slice().reverse().map(p => `L ${toX(p.y).toFixed(1)} ${toY(p.proj.low).toFixed(1)}`).join(' '),
            'Z',
          ].join(' ');
          return <path key={`b-${person.id}`} d={band} fill={person.color} opacity={0.1} />;
        })}
        {allPoints.map(({ person, points }) => (
          <path key={`l-${person.id}`}
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.y).toFixed(1)} ${toY(p.proj.expected).toFixed(1)}`).join(' ')}
            stroke={person.color} strokeWidth={2} fill="none" strokeLinecap="round"
          />
        ))}
        <line x1={toX(year)} y1={pT} x2={toX(year)} y2={h - pB} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
        {allPoints.map(({ person }) => {
          const proj = person.project(Math.min(year, maxYears));
          return <circle key={`d-${person.id}`} cx={toX(Math.min(year, maxYears))} cy={toY(proj.expected)} r={5} fill={person.color} stroke="var(--pearl)" strokeWidth={2} />;
        })}
        <text x={toX(year)} y={pT - 4} textAnchor="middle" fontSize={9.5} fill="var(--primary)" fontFamily="Outfit, sans-serif" fontWeight="600">{year}y</text>
      </svg>

      <p style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: 'var(--mauve-deep)', margin: '10px 0 0', letterSpacing: 0.2, lineHeight: 1.5 }}>
        Faded bands show 80% confidence range · log y-axis · drag to scrub the year
      </p>
    </div>
  );
}
