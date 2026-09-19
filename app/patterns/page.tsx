'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import type { HisFile } from '@/lib/hisfile';
import {
  FEELING_LABEL, PATTERNS_MIN_DATES, PATTERNS_MIN_MEN, readiness, whatTheDatesSay, whatToTryNext, yourPatterns,
  type Band, type DimensionRead, type Mover,
} from '@/lib/patterns';

/**
 * Her dating files, read across. Three sections: plain facts from the dates,
 * her own slider answers summarised back to her as bands, and at most two
 * things to try that come from her data. Held back until she has four
 * completed dates across two men; below that, what she still needs.
 *
 * Copy rules, kept here on purpose: she is never assigned a category, nothing
 * is a test, a diagnosis or a finding, and the two measures are named for the
 * behaviour they describe, not for a theory.
 */

const BAND_LABEL: Record<Band, string> = { low: 'Low', moderate: 'Moderate', high: 'High' };
const BAND_STYLE: Record<Band, { bg: string; fg: string }> = {
  low: { bg: 'var(--sage-pale)', fg: 'var(--sage-deep)' },
  moderate: { bg: 'var(--blush-pale)', fg: 'var(--gold-deep)' },
  high: { bg: 'var(--deeprose-pale)', fg: 'var(--deeprose-deep)' },
};

const BEHAVIOUR: Record<DimensionRead['dimension'], Record<Band, string>> = {
  anxiety: {
    high: 'You tend to want a reply fast after a date, and a quiet day from him tends to unsettle you.',
    moderate: 'You notice when he goes quiet, but it does not usually take over your day.',
    low: 'You do not seem to wait on his reply much. A quiet day from him tends to leave you fine.',
  },
  avoidance: {
    high: 'You tend to hold back on dates, and to show him a version of yourself rather than something real.',
    moderate: 'You let him see some of yourself, and keep some back.',
    low: 'You tend to let him see something real, without much holding back.',
  },
};

const DIMENSION_TITLE: Record<DimensionRead['dimension'], string> = {
  anxiety: 'Wanting his reply',
  avoidance: 'Holding back',
};

function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}

const card: React.CSSProperties = { padding: '22px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' };
const eyebrow: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 6 };
const body: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)', lineHeight: 1.6, fontWeight: 300, margin: 0 };
const quiet: React.CSSProperties = { ...body, color: 'var(--dark-soft)', fontSize: 13 };
const heading: React.CSSProperties = { fontFamily: 'var(--serif)', fontSize: 'clamp(24px,4vw,32px)', fontWeight: 400, color: 'var(--dark)', margin: '0 0 6px', letterSpacing: -0.3, lineHeight: 1.1 };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid var(--gold-pale)' }}>
      <div style={eyebrow}>{label}</div>
      {children}
    </div>
  );
}

function Quote({ m }: { m: Mover }) {
  return (
    <div style={{ padding: '10px 14px', borderLeft: '2px solid var(--gold-pale)', marginTop: 8 }}>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.4 }}>
        {m.prompt} <span style={{ fontStyle: 'normal', color: 'var(--primary-deep)' }}>{m.answer}</span>
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)', marginTop: 4 }}>
        <Link href={`/hisfile/${m.fileId}`} style={{ color: 'inherit' }}>{m.who}</Link>, date {m.dateNumber}{m.date ? `, ${shortDate(m.date)}` : ''}
      </div>
    </div>
  );
}

function BandCard({ read, extra }: { read: DimensionRead; extra?: string | null }) {
  const title = DIMENSION_TITLE[read.dimension];
  if (!read.band) {
    return (
      <div style={card}>
        <div style={eyebrow}>{title}</div>
        <p style={quiet}>Nothing to read yet. This fills in from the sliders under Before and After on each date.</p>
      </div>
    );
  }
  const banded = read.perMan.filter(m => m.dates >= 2);
  const contrast = read.differsByMan
    ? `Different with different men: ${banded.map(m => `${BAND_LABEL[m.band].toLowerCase()} with ${m.who}`).join(', ')}. A pattern that only shows up with one man is about him.`
    : banded.length >= 2
      ? `About the same with each man you have logged this with (${banded.map(m => m.who).join(', ')}).`
      : read.perMan.length === 1
        ? `So far this is only with ${read.perMan[0].who}. It reads as being about him until there is a second man to compare.`
        : null;
  const s = BAND_STYLE[read.band];
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={eyebrow}>{title}</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)' }}>Across your last {read.dates} date{read.dates === 1 ? '' : 's'} with answers</div>
        </div>
        <span style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 'var(--r-pill)', background: s.bg, color: s.fg, fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {BAND_LABEL[read.band]}
        </span>
      </div>
      <p style={{ ...body, marginTop: 12, fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 400 }}>{BEHAVIOUR[read.dimension][read.band]}</p>
      {extra && <p style={{ ...body, marginTop: 6 }}>{extra}</p>}
      {read.movers.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={eyebrow}>What moved it most, in your words</div>
          {read.movers.map((m, i) => <Quote key={i} m={m} />)}
        </div>
      )}
      {contrast && (
        <div style={{ marginTop: 14 }}>
          <div style={eyebrow}>With different men</div>
          <p style={body}>{contrast}</p>
        </div>
      )}
    </div>
  );
}

export default function PatternsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<HisFile[] | null>(null);
  const [redFlags, setRedFlags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/hisfile')
      .then(r => { if (r.status === 401) { router.push('/login'); return null; } return r.json(); })
      .then(d => { if (d) setFiles((d.files ?? []) as HisFile[]); })
      .catch(() => setFiles([]));
    fetch('/api/profile').then(r => r.json())
      .then(d => { if (Array.isArray(d?.profile?.personal_flags?.red)) setRedFlags(d.profile.personal_flags.red); })
      .catch(() => {});
  }, [router]);

  const ready = useMemo(() => readiness(files ?? []), [files]);
  const say = useMemo(() => (ready.ready ? whatTheDatesSay(files ?? []) : null), [files, ready.ready]);
  const you = useMemo(() => (ready.ready ? yourPatterns(files ?? []) : null), [files, ready.ready]);
  const next = useMemo(() => (say && you ? whatToTryNext(say, you, redFlags) : []), [say, you, redFlags]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <div className="v-eyebrow" style={{ marginBottom: 10 }}>Your patterns</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--dark)', margin: 0, letterSpacing: -0.5 }}>
            What your dates say, read back to you.
          </h1>
          <p style={{ ...quiet, marginTop: 10, fontSize: 14 }}>
            Everything here comes from your own files. Only you can see it.
          </p>
        </div>

        {files === null ? (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dark-soft)' }}>Loading...</p>
        ) : !ready.ready ? (
          <div style={card}>
            <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--dark)' }}>Not enough to read yet.</p>
            <p style={{ ...body, marginTop: 8 }}>
              This page opens once you have {PATTERNS_MIN_DATES} completed dates across {PATTERNS_MIN_MEN} men. A date is completed when its After section is filled in.
            </p>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)' }}>
                <span>Completed dates</span><span style={{ color: ready.needDates ? 'var(--deeprose-deep)' : 'var(--sage-deep)' }}>{ready.dates} of {PATTERNS_MIN_DATES}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)' }}>
                <span>Men with a completed date</span><span style={{ color: ready.needMen ? 'var(--deeprose-deep)' : 'var(--sage-deep)' }}>{ready.men} of {PATTERNS_MIN_MEN}</span>
              </div>
            </div>
            <p style={{ ...quiet, marginTop: 16 }}>
              {ready.needDates > 0 && `Fill in After on ${ready.needDates} more date${ready.needDates === 1 ? '' : 's'}`}
              {ready.needDates > 0 && ready.needMen > 0 && ', '}
              {ready.needMen > 0 && `${ready.needDates > 0 ? 'with' : 'Log a date with'} ${ready.needMen === 1 ? 'one more man' : `${ready.needMen} more men`}`}
              {(ready.needDates > 0 || ready.needMen > 0) && '.'}
            </p>
            <Link href="/hisfile" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--primary-deep)', textDecoration: 'underline' }}>Go to His File</Link>
          </div>
        ) : say && you ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Section 1 */}
            <section>
              <div className="v-eyebrow" style={{ marginBottom: 8 }}>01</div>
              <h2 style={heading}>What the dates say</h2>
              <p style={{ ...quiet, marginBottom: 16 }}>Plain counts from your files. No reading between the lines.</p>
              <div style={{ ...card, paddingTop: 8, paddingBottom: 8 }}>
                <Row label="How the dates felt, by where you met him">
                  {say.byMet.length === 0 ? <p style={quiet}>No afterwards feelings logged yet.</p> : say.byMet.map(b => (
                    <div key={b.where} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)', padding: '3px 0' }}>
                      <span>{b.where}</span>
                      <span style={{ color: 'var(--dark-soft)', textAlign: 'right' }}>{FEELING_LABEL[b.feeling]} · {b.count} date{b.count === 1 ? '' : 's'}, {b.men} {b.men === 1 ? 'man' : 'men'}</span>
                    </div>
                  ))}
                </Row>
                <Row label="Your most common icks">
                  {say.icks.length === 0 ? <p style={quiet}>No icks logged yet.</p> : say.icks.map(i => (
                    <div key={i.text} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)', padding: '3px 0' }}>
                      <span>{i.text}</span>
                      <span style={{ color: 'var(--dark-soft)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {i.men} {i.men === 1 ? 'man' : 'men'}{i.typicalDate ? `, usually by date ${i.typicalDate}` : ''}
                      </span>
                    </div>
                  ))}
                </Row>
                <Row label="When feeling up beforehand turned into unsure or worse after">
                  {say.drops.compared === 0 ? (
                    <p style={quiet}>Log a Before mood and an After feeling on the same date and this fills in.</p>
                  ) : (
                    <>
                      <p style={body}>{say.drops.drops} of {say.drops.compared} date{say.drops.compared === 1 ? '' : 's'} you went into feeling up.</p>
                      {say.drops.withWhom.length > 0 && (
                        <p style={{ ...quiet, marginTop: 4 }}>
                          {say.drops.withWhom.map(w => `${w.who} (${w.drops} of ${w.of})`).join(', ')}
                        </p>
                      )}
                    </>
                  )}
                </Row>
                <Row label="How many dates before you stop logging him">
                  {say.stops.average === null ? (
                    <p style={quiet}>Nothing has ended yet, so there is no average to give.</p>
                  ) : (
                    <p style={body}>About {say.stops.average} date{say.stops.average === 1 ? '' : 's'}, across {say.stops.men} {say.stops.men === 1 ? 'man' : 'men'} whose files ended or went quiet.</p>
                  )}
                </Row>
                <Row label="Who paid on first dates">
                  {say.paid.total === 0 ? <p style={quiet}>Not logged yet.</p> : (
                    <p style={body}>{say.paid.split.map(p => `${p.who}: ${p.count} of ${say.paid.total}`).join(' · ')}</p>
                  )}
                </Row>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <div className="v-eyebrow" style={{ marginBottom: 8 }}>02</div>
              <h2 style={heading}>Your patterns</h2>
              <p style={{ ...quiet, marginBottom: 16 }}>From the sliders you answered before and after your last {you.window} date{you.window === 1 ? '' : 's'}.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <BandCard
                  read={you.anxiety}
                  extra={you.replyAfterGoodDates === 'faster'
                    ? 'You tend to want a reply faster after dates that went well.'
                    : you.replyAfterGoodDates === 'slower'
                      ? 'You tend to want a reply faster after dates that felt off.'
                      : null}
                />
                <BandCard read={you.avoidance} />
              </div>
              {you.suggestTalkingItThrough && (
                <p style={{ ...quiet, marginTop: 14 }}>
                  When something sits high with most of the men you see, talking it through with a therapist can help. Nothing urgent in that; it is simply useful.
                </p>
              )}
              <p style={{ ...quiet, marginTop: 14, fontStyle: 'italic' }}>
                These are your own answers, summarised back to you. They are not a psychological assessment.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <div className="v-eyebrow" style={{ marginBottom: 8 }}>03</div>
              <h2 style={heading}>What to try next</h2>
              {next.length === 0 ? (
                <div style={card}><p style={quiet}>Nothing stands out yet. Keep logging Before and After, and this fills in from your own entries.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {next.map((s, i) => (
                    <div key={i} style={{ ...card, borderLeft: '3px solid var(--primary)' }}>
                      <p style={{ ...body, fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400 }}>{s.text}</p>
                      {s.fileId && <Link href={`/hisfile/${s.fileId}`} style={{ display: 'inline-block', marginTop: 8, fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--primary-deep)', textDecoration: 'underline' }}>Open his file</Link>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
