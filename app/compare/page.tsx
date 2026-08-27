'use client';
import { useState, useEffect } from 'react';
import { Nav } from '@/components/nav/Nav';
import { Footer } from '@/components/landing/Footer';
import { Floret } from '@/components/ui/Floret';
import Link from 'next/link';
import { Report } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────

interface CompareEntry {
  id: string;
  name: string;
  initials: string;
  age: number;
  title: string;
  company: string;
  tenure: string;
  llcs: string;
  score: 'green' | 'yellow' | 'red';
  addressCount: number;
  currentAddress: string;
  publicFlags: string[];
  publicClears: string[];
  phoneType: string;
  verifiedBy: number;
  summary: string;
  nextSteps: string[];
}

const SCORE_LABELS: Record<string, string> = {
  green: 'Green light',
  yellow: 'Soft yellow',
  red: 'Deep rose',
};

const SCORE_CONFIG: Record<string, { bg: string; dot: string; text: string; deep: string }> = {
  green:  { bg: 'var(--sage-pale)',     dot: 'var(--sage)',     text: 'var(--sage-deep)',     deep: 'var(--sage-deep)' },
  yellow: { bg: 'var(--honey-pale)',    dot: 'var(--honey)',    text: 'var(--honey-deep)',    deep: 'var(--honey-deep)' },
  red:    { bg: 'var(--deeprose-pale)', dot: 'var(--deeprose)', text: 'var(--deeprose-deep)', deep: 'var(--deeprose-deep)' },
};

// ── Sample data ────────────────────────────────────────────────────────────

const SAMPLE_MEN: CompareEntry[] = [
  {
    id: 'alex', name: 'Alex Pierre', initials: 'AP', age: 32,
    title: 'Founder & CEO', company: 'Fielder AI (Series A)', tenure: '4 years',
    llcs: 'Fielder AI Inc., JAH Ventures LLC',
    score: 'yellow',
    addressCount: 3, currentAddress: 'San Francisco, CA (renting)',
    publicFlags: ['VoIP secondary line detected', '1 civil dispute open · 2023'],
    publicClears: ['Sex offender registry: clear', 'No bankruptcy', 'No evictions'],
    phoneType: 'VoIP detected · possible secondary line',
    verifiedBy: 3,
    summary: 'Identity cross-references cleanly. Two items worth a conversation: the VoIP line and an open civil filing. Neither is a hard stop, but both are worth asking about.',
    nextSteps: ['Ask about the VoIP number directly — "do you have two phones?" is natural.', 'The civil dispute is open, not closed. Ask casually what the situation is.', 'Meet in public for the first meeting.'],
  },
  {
    id: 'reid', name: 'Reid Whitman', initials: 'RW', age: 36,
    title: 'Corporate Attorney', company: 'Cravath, Swaine & Moore', tenure: '6 years',
    llcs: 'None found.',
    score: 'green',
    addressCount: 2, currentAddress: 'Manhattan, NY · 1 Columbus Circle (owned)',
    publicFlags: [],
    publicClears: ['Sex offender registry: clear', 'No bankruptcy', 'No evictions', 'No criminal record', 'Identity verified · 4 sources'],
    phoneType: 'T-Mobile · mobile · 8 years',
    verifiedBy: 4,
    summary: 'Clean across all sources. Identity verified at four cross-references. Bar registration active. No flags of any kind.',
    nextSteps: ['Record is clean. Meet in a public place — your standard, not a safety measure.', 'Quick reverse image search on his photos takes 30 seconds.', 'If anything feels off in person, trust that over the green score.'],
  },
  {
    id: 'marcus', name: 'Marcus Anderson', initials: 'MA', age: 41,
    title: 'Real Estate Operator', company: 'Anderson Holdings LLC', tenure: '11 years',
    llcs: 'Anderson Holdings LLC, SunBelt Properties LLC, MR 2017 Trust',
    score: 'yellow',
    addressCount: 5, currentAddress: 'Scottsdale, AZ (owned)',
    publicFlags: ['Active civil suit · Los Angeles County · 2024'],
    publicClears: ['Sex offender registry: clear', 'No criminal record', 'No evictions', 'No bankruptcy'],
    phoneType: 'AT&T · mobile · 11 years',
    verifiedBy: 3,
    summary: 'Clean record except for an active civil case in LA County. Three LLCs and a trust in public filings. Address history spans five states.',
    nextSteps: ['The civil suit is worth a casual mention.', 'Five addresses in 11 years is worth understanding.', 'Meet in public, daytime first meeting.'],
  },
  {
    id: 'daniel', name: 'Daniel Chen', initials: 'DC', age: 34,
    title: 'Senior Staff Engineer', company: 'Stripe · Infrastructure', tenure: '5 years',
    llcs: 'None found.',
    score: 'green',
    addressCount: 2, currentAddress: 'San Francisco, CA (renting)',
    publicFlags: [],
    publicClears: ['Sex offender registry: clear', 'No criminal record', 'No bankruptcy', 'No evictions', 'Identity verified · 4 sources'],
    phoneType: 'T-Mobile · mobile · 6 years',
    verifiedBy: 4,
    summary: 'Clean across all sources. Identity verified at four cross-references. Phone is a stable mobile line. No flags.',
    nextSteps: ['Clean record. Meet in public — your standard.', 'Reverse image search on his profile photos.', 'Trust your instincts in person.'],
  },
];

function reportToEntry(report: Report): CompareEntry {
  const parts = report.subject.name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : report.subject.name.slice(0, 2).toUpperCase();

  const publicFlags = report.publicRecords.filter(r => r.flag || (!r.good && !r.neutral)).map(r => `${r.label}: ${r.value}`);
  const publicClears = report.publicRecords.filter(r => r.good).map(r => r.label + ': clear');
  const currentAddr = report.addresses.find(a => a.current)?.addr ?? report.addresses[0]?.addr ?? '—';

  return {
    id: report.searchId,
    name: report.subject.name,
    initials,
    age: report.subject.age,
    title: report.professional.title,
    company: report.professional.company,
    tenure: report.professional.tenure,
    llcs: report.professional.llcs,
    score: report.score,
    addressCount: report.addresses.length,
    currentAddress: currentAddr,
    publicFlags,
    publicClears,
    phoneType: `${report.phone.carrier} · ${report.phone.lineType}${report.phone.voipFlag ? ' · ' + report.phone.voipFlag : ''} · ${report.phone.numberAge}`,
    verifiedBy: report.identity.verifiedBy,
    summary: report.summary,
    nextSteps: report.nextSteps,
  };
}

function loadSessionReports(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  const entries: CompareEntry[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('report-')) {
      try { entries.push(reportToEntry(JSON.parse(sessionStorage.getItem(key)!))); } catch {}
    }
  }
  return entries;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SCORE_ORDER = { red: 0, yellow: 1, green: 2 };

function sortedByScore(people: CompareEntry[]) {
  return [...people].sort((a, b) => SCORE_ORDER[b.score] - SCORE_ORDER[a.score]);
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [people, setPeople] = useState<CompareEntry[]>(SAMPLE_MEN);
  const [usingRealData, setUsingRealData] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fromSession = loadSessionReports();
    if (fromSession.length >= 2) { setPeople(fromSession); setUsingRealData(true); }
  }, []);

  const ranked = sortedByScore(people);
  const leader = ranked[0];
  const flagCount = (p: CompareEntry) => p.publicFlags.length;
  const totalFlags = people.reduce((s, p) => s + flagCount(p), 0);

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(20px, 4vw, 56px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 36 }}>
          <div style={{ maxWidth: 640 }}>
            <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', textDecoration: 'none', marginBottom: 14 }}>
              ← Back to search
            </Link>
            {!usingRealData && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--gold-pale)', borderRadius: 'var(--r-pill)', marginBottom: 14, marginLeft: 12, fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--gold-deep)' }}>
                Sample data — run searches to compare real men
              </div>
            )}
            <h1 className="v-display-lg v-serif" style={{ fontWeight: 400, color: 'var(--dark)', margin: 0 }}>
              Side by side. <em style={{ color: 'var(--rose)' }}>All the facts.</em>
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.6, margin: '18px 0 0', maxWidth: 500, fontWeight: 300 }}>
              Every man from your recent searches, compared on public record, identity verification, phone signals, and address history. Sorted by safety score.
            </p>
          </div>
          <Floret size={48} color="var(--blush-deep)" center="var(--ivory)" />
        </div>

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          {(['green', 'yellow', 'red'] as const).map(score => {
            const count = people.filter(p => p.score === score).length;
            const c = SCORE_CONFIG[score];
            return (
              <div key={score} style={{ padding: '10px 18px', borderRadius: 'var(--r-pill)', background: c.bg, border: `1px solid ${c.dot}33`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot }} />
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: c.deep, fontWeight: 500 }}>{count} {SCORE_LABELS[score]}</span>
              </div>
            );
          })}
          {totalFlags > 0 && (
            <div style={{ padding: '10px 18px', borderRadius: 'var(--r-pill)', background: 'var(--honey-pale)', border: '1px solid var(--honey)33', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--honey-deep)', fontWeight: 500 }}>{totalFlags} flag{totalFlags !== 1 ? 's' : ''} across all files</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>Sorted by safety score · {ranked.length} men</div>

            {ranked.map((person, i) => {
              const c = SCORE_CONFIG[person.score];
              const isExpanded = expanded === person.id;
              return (
                <div key={person.id} style={{ borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)', borderLeft: `3px solid ${c.dot}`, overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpanded(isExpanded ? null : person.id)}
                    style={{ padding: '18px 20px', cursor: 'pointer' }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 36, color: 'var(--gold)', fontWeight: 300, lineHeight: 1, opacity: 0.55, minWidth: 24, textAlign: 'center' }}>
                        {i + 1}
                      </span>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: c.deep, flexShrink: 0 }}>
                        {person.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)', lineHeight: 1.2 }}>{person.name}</div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--dark-soft)', marginTop: 3 }}>
                          {person.title} · {person.company}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--r-pill)', background: c.bg }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot }} />
                          <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: c.deep, fontWeight: 500 }}>{SCORE_LABELS[person.score]}</span>
                        </div>
                        {person.publicFlags.length > 0 && (
                          <span style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: 'var(--honey-deep)' }}>
                            {person.publicFlags.length} flag{person.publicFlags.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--mauve-deep)', flexShrink: 0 }}>
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* Quick facts bar */}
                    <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ivory-deep)', flexWrap: 'wrap' }}>
                      <QuickFact label="Phone" value={person.phoneType} />
                      <QuickFact label="Location" value={person.currentAddress} />
                      <QuickFact label="Verified by" value={`${person.verifiedBy} sources`} />
                      {person.addressCount > 1 && <QuickFact label="Address history" value={`${person.addressCount} known addresses`} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--ivory-deep)', marginTop: 0 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                        {/* Public record flags */}
                        <div>
                          <div className="v-eyebrow" style={{ fontSize: 9, marginBottom: 10 }}>Flags</div>
                          {person.publicFlags.length === 0 ? (
                            <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--sage-deep)' }}>None found</div>
                          ) : person.publicFlags.map((f, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--honey)', flexShrink: 0, marginTop: 4 }} />
                              <span style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--honey-deep)', lineHeight: 1.4 }}>{f}</span>
                            </div>
                          ))}
                        </div>
                        {/* Clears */}
                        <div>
                          <div className="v-eyebrow" style={{ fontSize: 9, marginBottom: 10 }}>Clear</div>
                          {person.publicClears.slice(0, 4).map((c, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0, marginTop: 4 }} />
                              <span style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', lineHeight: 1.4 }}>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Business entities */}
                      {person.llcs && person.llcs !== 'None found.' && (
                        <div style={{ marginTop: 16 }}>
                          <div className="v-eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Business entities</div>
                          <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark)', lineHeight: 1.5 }}>{person.llcs}</div>
                        </div>
                      )}

                      {/* Summary */}
                      <div style={{ marginTop: 16, padding: '14px 16px', background: c.bg, borderRadius: 'var(--r-md)' }}>
                        <div className="v-eyebrow" style={{ fontSize: 9, color: c.deep, marginBottom: 6 }}>Verity's read</div>
                        <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: c.deep, lineHeight: 1.55, margin: 0 }}>{person.summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right panel */}
          <div style={{ position: 'sticky', top: 92, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Verity's overall read */}
            <div style={{ background: 'var(--primary-deep)', borderRadius: 'var(--r-xl)', padding: '28px 24px' }}>
              <div className="v-eyebrow" style={{ fontSize: 9, color: 'var(--gold)', marginBottom: 12 }}>Verity's overall read</div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ivory)', lineHeight: 1.55, margin: '0 0 20px', fontWeight: 300 }}>
                {leader?.score === 'green'
                  ? `"${leader.name.split(' ')[0]} is the cleanest file here. The record is clear, identity is verified, and the phone is a stable mobile line."`
                  : leader?.score === 'yellow'
                  ? `"No one here is a clear walk-away, but ${leader.name.split(' ')[0]} has the fewest flags. Read the detail before you decide."`
                  : '"All files in this set carry flags. Review each one carefully before proceeding."'}
              </p>

              {/* Score summary grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div className="v-eyebrow" style={{ fontSize: 8, color: 'var(--gold-pale)', marginBottom: 5 }}>Cleanest file</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ivory)', fontWeight: 400, lineHeight: 1.1 }}>{leader?.name}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve)', marginTop: 3 }}>{leader ? SCORE_LABELS[leader.score] : '—'}</div>
                </div>
                <div>
                  <div className="v-eyebrow" style={{ fontSize: 8, color: 'var(--gold-pale)', marginBottom: 5 }}>Total public flags</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: totalFlags === 0 ? 'var(--sage)' : 'var(--honey)', fontWeight: 400, lineHeight: 1.1 }}>{totalFlags}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve)', marginTop: 3 }}>across {people.length} files</div>
                </div>
              </div>
            </div>

            {/* Verification summary */}
            <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '20px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div className="v-eyebrow" style={{ fontSize: 9, marginBottom: 14 }}>Identity verification</div>
              {ranked.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: SCORE_CONFIG[p.score].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 10, color: SCORE_CONFIG[p.score].deep }}>{p.initials}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark)' }}>{p.name.split(' ')[0]}</div>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, color: 'var(--dark-soft)' }}>verified by {p.verifiedBy} sources</div>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {Array.from({ length: 4 }, (_, j) => (
                      <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: j < p.verifiedBy ? SCORE_CONFIG[p.score].dot : 'var(--ivory-deep)' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Link href="/search" style={{
              display: 'block', padding: '14px', borderRadius: 'var(--r-lg)',
              background: 'var(--primary)', color: 'var(--ivory)',
              fontFamily: 'var(--serif)', fontSize: 14, textAlign: 'center',
              textDecoration: 'none', boxShadow: 'var(--shadow-pop)',
            }}>
              + Add another search
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 9.5, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark)', lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}
