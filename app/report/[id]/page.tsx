'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { Wordmark } from '@/components/ui/Wordmark';
import { Floret } from '@/components/ui/Floret';
import { Report, ScoreState } from '@/lib/types';

export default function ReportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--dark-soft)' }}>Loading report...</p>
    </div>
  );
}

function ReportContent() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    const stored = sessionStorage.getItem(`report-${id}`);
    if (stored) {
      setReport(JSON.parse(stored));
    } else {
      setNotFound(true);
    }
  }, [params.id]);

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--dark)' }}>Report not found</p>
        <Link href="/search" style={{ padding: '14px 28px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 16 }}>
          Run a new search
        </Link>
      </div>
    );
  }

  if (!report) return <LoadingState />;

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div className="v-grid-report" style={{
        padding: 'clamp(20px, 4vw, 56px)', maxWidth: 1480, margin: '0 auto',
      }}>
        <ReportSidebar report={report} onCompare={() => router.push('/compare')} />
        <ReportMain report={report} />
        <ReportActionSidebar report={report} onCompare={() => router.push('/compare')} />
      </div>
    </div>
  );
}

function ReportSidebar({ report, onCompare }: { report: Report; onCompare: () => void }) {
  const sections = ['Safety score', 'Phone intelligence', 'Identity', 'Address history', 'Relationships', 'Professional', 'Public records', 'Social footprint', 'Recommendations'];
  return (
    <aside className="v-hide-mobile" style={{ position: 'sticky', top: 92, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => history.back()} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        border: 0, background: 'transparent', cursor: 'pointer', alignSelf: 'flex-start',
        fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)',
      }}>
        ← New search
      </button>

      <div style={{ padding: 18, borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="v-eyebrow" style={{ marginBottom: 10 }}>Jump to</div>
        {sections.map((s, i) => (
          <a key={i} href={`#sec-${i}`} style={{
            fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)',
            textDecoration: 'none', padding: '8px 10px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mauve)', flexShrink: 0 }} />
            {s}
          </a>
        ))}
      </div>

      <div style={{ padding: 18, borderRadius: 'var(--r-lg)', background: 'var(--ivory-warm)' }}>
        <div className="v-eyebrow" style={{ marginBottom: 12 }}>Report ID</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--dark-soft)', letterSpacing: 0.3 }}>{report.searchId}</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', marginTop: 6 }}>
          {new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </aside>
  );
}

function ReportMain({ report }: { report: Report }) {
  const scoreConfig = getScoreConfig(report.score);
  const initials = report.subject.name.split(' ').map((n: string) => n[0]).join('');

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="v-eyebrow">Verity report · {report.searchId}</span>
          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1.05, fontWeight: 400,
            color: 'var(--dark)', margin: '6px 0 0', letterSpacing: -0.4,
          }}>
            <em style={{ color: 'var(--gold)' }}>On</em> {report.subject.name}
          </h1>
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--mauve-deep)', textAlign: 'right' }}>
          {report.confidence}% confidence · {report.sources} sources
        </div>
      </div>

      {/* Score badge */}
      <div id="sec-0" style={{
        display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', borderRadius: 'var(--r-xl)',
        overflow: 'hidden', boxShadow: `0 16px 50px ${scoreConfig.glow}, 0 2px 6px rgba(61,36,52,0.06)`,
      }}>
        <div style={{ padding: '36px 36px 32px', background: scoreConfig.bg, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%',
            background: `radial-gradient(circle, ${scoreConfig.accent} 0%, transparent 65%)`, opacity: 0.55,
          }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="v-eyebrow" style={{ color: scoreConfig.deep, marginBottom: 16 }}>Safety score · live</div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 72, fontWeight: 400,
              color: scoreConfig.deep, lineHeight: 0.95, letterSpacing: -1,
            }}>
              {scoreConfig.label.split(' ')[0]}<br />
              <em style={{ fontWeight: 300 }}>{scoreConfig.label.split(' ')[1]}</em>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: scoreConfig.deep, opacity: 0.8, marginTop: 12 }}>
              {scoreConfig.sub}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${scoreConfig.deep}22` }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--ivory-warm), var(--champagne))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--dark-soft)',
                boxShadow: `0 0 0 3px ${scoreConfig.bg}, 0 0 0 4px ${scoreConfig.deep}33`,
              }}>{initials}</div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: scoreConfig.deep }}>{report.subject.name}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: scoreConfig.deep, opacity: 0.7, marginTop: 2 }}>
                  Age {report.subject.age} · {report.subject.phone}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '36px 36px 32px', background: 'var(--pearl)', display: 'flex', flexDirection: 'column' }}>
          <div className="v-eyebrow" style={{ marginBottom: 16 }}>Verity's verdict</div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, lineHeight: 1.1, color: 'var(--dark)',
            fontStyle: 'italic', letterSpacing: -0.3,
          }}>
            "{report.headline}"
          </div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, lineHeight: 1.65, color: 'var(--dark)', margin: '20px 0 0', fontWeight: 300 }}>
            {report.summary}
          </p>
          <div style={{ flex: 1 }} />
          <div style={{ marginTop: 24, display: 'flex', gap: 24, fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--dark-soft)', letterSpacing: 0.3 }}>
            <span><span style={{ opacity: 0.6 }}>CONFIDENCE</span> {report.confidence}%</span>
            <span><span style={{ opacity: 0.6 }}>SOURCES</span> {report.sources}</span>
            <span><span style={{ opacity: 0.6 }}>GENERATED</span> JUST NOW</span>
          </div>
        </div>
      </div>

      {/* Phone + Identity */}
      <div id="sec-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section eyebrow="01" title="Phone intelligence">
          <KVRow label="Carrier" value={report.phone.carrier} />
          <KVRow label="Line type" value={report.phone.lineType === 'voip' ? 'Mobile + VoIP secondary' : report.phone.lineType === 'mobile' ? 'Mobile, single line' : 'Landline'} />
          <KVRow label="Number age" value={report.phone.numberAge} />
          <KVRow label="Origin" value={report.phone.origin} />
          {report.phone.voipFlag && <FlagNote tone={report.score === 'red' ? 'red' : 'yellow'}>{report.phone.voipFlag}</FlagNote>}
        </Section>

        <Section id="sec-2" eyebrow="02" title="Identity signals">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Stat label="Full name" value={report.identity.fullName} />
            <Stat label="Age" value={String(report.identity.age || '—')} />
            <Stat label="Date of birth" value={report.identity.dob} />
            <Stat label="Verified by" value={`${report.identity.verifiedBy} sources`} />
          </div>
        </Section>
      </div>

      {/* Addresses */}
      <Section id="sec-3" eyebrow="03" title="Address history">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 32px' }}>
          {report.addresses.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderTop: i >= 2 ? '1px solid var(--gold-pale)' : 'none' }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', marginTop: 8, flexShrink: 0,
                background: a.flag ? 'var(--deeprose)' : a.current ? 'var(--rose)' : 'var(--mauve)',
                boxShadow: a.current ? '0 0 0 3px var(--blush-pale)' : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>{a.years}</span>
                  {a.current && <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--gold)' }}>· current</span>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--dark)', lineHeight: 1.2 }}>{a.addr}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: a.flag ? 'var(--deeprose-deep)' : 'var(--dark-soft)', marginTop: 4, fontWeight: a.flag ? 500 : 300 }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Relationships + Professional */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section id="sec-4" eyebrow="04" title="Relationships">
          <KVRow label="Status" value={report.relationships.status} />
          {report.relationships.spouse && <KVRow label="Spouse" value={report.relationships.spouse} />}
          <KVRow label="Prior marriages" value={report.relationships.priors} />
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>Known relatives</div>
          <TagList items={report.relationships.relatives} />
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>Close associates</div>
          <TagList items={report.relationships.associates} />
        </Section>

        <Section id="sec-5" eyebrow="05" title="Professional">
          <div style={{ padding: '14px 16px', background: 'var(--ivory)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--dark)', lineHeight: 1.2 }}>
              {report.professional.title}
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', marginTop: 4 }}>
              {report.professional.company} · {report.professional.tenure}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Stat label="Est. income" value={report.professional.income} />
            <Stat label="Est. net worth" value={report.professional.networth} />
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>Business entities</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark)', lineHeight: 1.5, fontWeight: 300 }}>{report.professional.llcs}</div>
        </Section>
      </div>

      {/* Public records */}
      <Section id="sec-6" eyebrow="06" title="Public record flags" accent={report.score === 'red' ? 'var(--deeprose-pale)' : 'var(--blush-pale)'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 32px' }}>
          {report.publicRecords.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderTop: i >= 2 ? '1px solid var(--gold-pale)' : 'none' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: p.good ? 'var(--sage-pale)' : p.flag ? 'var(--deeprose-pale)' : 'var(--ivory-warm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.good && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5L9.5 3" stroke="var(--sage-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {p.flag && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2.5v4M6 8.5v.5" stroke="var(--deeprose-deep)" strokeWidth="2" strokeLinecap="round"/></svg>}
                {p.neutral && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mauve-deep)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 13.5, lineHeight: 1.4, color: p.flag ? 'var(--deeprose-deep)' : 'var(--dark)', fontWeight: p.flag ? 500 : 300 }}>
                  {p.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Social */}
      <Section id="sec-7" eyebrow="07" title="Social footprint">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 32 }}>
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 10 }}>Known handles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {report.social.handles.map((h, i) => (
                <div key={i} style={{ padding: '10px 14px', background: 'var(--ivory)', borderRadius: 'var(--r-md)', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark)' }}>{h}</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--mauve-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 10 }}>Presence</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.6, fontWeight: 300 }}>{report.social.presence}</div>
            {report.social.inconsistency !== 'None flagged.' && (
              <FlagNote tone={report.score === 'red' ? 'red' : 'yellow'}>{report.social.inconsistency}</FlagNote>
            )}
          </div>
        </div>
      </Section>

      {/* Footer note */}
      <div style={{ textAlign: 'center', marginTop: 12, padding: '16px 0' }}>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--dark-soft)', lineHeight: 1.5 }}>
          Verity does not predict the future.<br />
          It tells you what's true today, so you can decide tomorrow.
        </div>
        <div style={{ marginTop: 14, fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', letterSpacing: 0.3, lineHeight: 1.6 }}>
          Sources: Whitepages Pro, ATTOM, BeenVerified, PACER, FEC, NSOPW, PDL
        </div>
      </div>
    </main>
  );
}

function ReportActionSidebar({ report, onCompare }: { report: Report; onCompare: () => void }) {
  return (
    <aside style={{ position: 'sticky', top: 92, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Recommendations */}
      <div id="sec-8" style={{
        padding: '24px 22px', borderRadius: 'var(--r-lg)',
        background: 'linear-gradient(160deg, var(--primary) 0%, var(--primary-deep) 100%)',
        color: 'var(--ivory)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--rose) 0%, transparent 65%)', opacity: 0.4,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Floret size={18} color="var(--blush)" center="var(--wine)" />
            <div className="v-eyebrow" style={{ color: 'var(--blush)', fontSize: 10 }}>your move</div>
          </div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, lineHeight: 1.1, margin: 0, color: 'var(--ivory)' }}>
            What we'd <em style={{ color: 'var(--blush)' }}>do next</em>.
          </h3>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {report.nextSteps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16,
                  color: 'var(--blush)', lineHeight: 1, flexShrink: 0, paddingTop: 2,
                  width: 18, textAlign: 'right',
                }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ivory)', lineHeight: 1.5, opacity: 0.92, fontWeight: 300 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 18, borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ActionButton icon="compare" label="Compare with others" onClick={onCompare} />
        <ActionButton icon="dl" label="Download PDF" onClick={() => window.print()} />
        <ActionButton icon="share" label="Share with your circle" />
        <ActionButton icon="bell" label="Re-run in 30 days" />
      </div>

      <div style={{
        padding: 16, borderRadius: 'var(--r-lg)', background: 'var(--blush-pale)',
        fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--wine)',
        lineHeight: 1.5, textAlign: 'center',
      }}>
        "Trust your gut. A clean report doesn't replace your read of him in person."
        <div style={{ fontFamily: 'var(--sans)', fontStyle: 'normal', fontSize: 10, color: 'var(--wine)', opacity: 0.7, marginTop: 8, letterSpacing: 0.3 }}>
          VERITY'S CARDINAL RULE
        </div>
      </div>
    </aside>
  );
}

// ── Helper components ─────────────────────────────────────────────────────

function Section({ id, eyebrow, title, children, accent = 'var(--blush-pale)' }: {
  id?: string; eyebrow: string; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div id={id} style={{ borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 28px 18px' }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--gold)', fontWeight: 300 }}>{eyebrow}</span>
        </div>
        <div>
          <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 2 }}>Section {eyebrow}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--dark)', lineHeight: 1.1, fontWeight: 400 }}>{title}</div>
        </div>
      </div>
      <div style={{ padding: '0 28px 24px' }}>{children}</div>
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--gold-pale)' }}>
      <span className="v-eyebrow" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)' }}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--ivory)', borderRadius: 'var(--r-md)' }}>
      <div className="v-eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)', lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          padding: '5px 12px', background: 'var(--ivory)', borderRadius: 'var(--r-pill)',
          fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark)',
        }}>{item}</span>
      ))}
    </div>
  );
}

function FlagNote({ children, tone = 'yellow' }: { children: React.ReactNode; tone?: 'yellow' | 'red' }) {
  const bg = tone === 'red' ? 'var(--deeprose-pale)' : 'var(--honey-pale)';
  const color = tone === 'red' ? 'var(--deeprose-deep)' : 'var(--honey-deep)';
  return (
    <div style={{ marginTop: 12, padding: '12px 14px', background: bg, borderRadius: 'var(--r-md)', fontFamily: 'var(--sans)', fontSize: 13, color, lineHeight: 1.5, fontWeight: 300 }}>
      {children}
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
      border: 0, background: 'transparent', cursor: 'pointer',
      borderRadius: 8, textAlign: 'left',
      fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark)', width: '100%',
    }}>
      <span style={{ width: 14, opacity: 0.6 }}>
        {icon === 'compare' && '⊕'}
        {icon === 'dl' && '↓'}
        {icon === 'share' && '↗'}
        {icon === 'bell' && '◷'}
      </span>
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', color: 'var(--mauve)' }}>→</span>
    </button>
  );
}

function getScoreConfig(score: ScoreState) {
  const configs = {
    green: { label: 'Green light', sub: 'Proceed with ease.', bg: 'var(--sage-pale)', deep: 'var(--sage-deep)', accent: 'var(--sage)', glow: 'rgba(135, 174, 126, 0.3)' },
    yellow: { label: 'Soft yellow', sub: 'Worth a slower pace.', bg: 'var(--honey-pale)', deep: 'var(--honey-deep)', accent: 'var(--honey)', glow: 'rgba(233, 178, 92, 0.3)' },
    red: { label: 'Deep rose', sub: "We'd skip this one.", bg: 'var(--deeprose-pale)', deep: 'var(--deeprose-deep)', accent: 'var(--deeprose)', glow: 'rgba(231, 80, 108, 0.3)' },
  };
  return configs[score];
}
