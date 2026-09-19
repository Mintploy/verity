'use client';
import Link from 'next/link';
import type { HisFile } from '@/lib/hisfile';
import { ickText, type DateEntry, type Feeling } from '@/lib/journal';

/**
 * What she reads in fifteen seconds before walking in.
 *
 * Everything on this card is her own writing: his name and status, how many
 * dates and how long since the last, what not to forget, what he loves, how
 * the last date felt and what she liked, her two latest icks. The only thing
 * from a report is the colour of the safety badge; no finding is ever shown
 * here.
 *
 * Fits one phone screen (iPhone 13 and up) by capping each list and keeping
 * every line to one line. Prints to a single page: the print rule below hides
 * everything else on the page.
 */

const FEELING_LABEL: Record<Feeling, string> = {
  'loved it': 'Loved it', good: 'Good', unsure: 'Not sure', off: 'Something felt off', bad: 'Bad',
};

const SCORE: Record<string, { label: string; bg: string; fg: string }> = {
  green: { label: 'Green', bg: 'var(--sage-pale)', fg: 'var(--sage-deep)' },
  yellow: { label: 'Yellow', bg: 'var(--honey-pale, var(--blush-pale))', fg: 'var(--gold-deep)' },
  red: { label: 'Red', bg: 'var(--deeprose-pale)', fg: 'var(--deeprose-deep)' },
};

function datesOf(f: HisFile): DateEntry[] {
  return f.dates?.length
    ? f.dates
    : [{ number: 1, date: f.first_date_date, location: f.first_date_location, paid: f.first_date_paid }];
}

function daysAgo(iso: string): number {
  const d = new Date(`${iso}T00:00:00`).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d) / 86400000);
}

export function HighlightsCard({ file, focus = false }: { file: HisFile; focus?: boolean }) {
  const dates = datesOf(file);
  const dated = dates.filter(d => d.date);
  const count = dated.length || (dates.some(d => d.feeling || d.duringFeeling || d.location) ? dates.length : 0);
  const past = dated.filter(d => daysAgo(d.date!) >= 0).sort((a, b) => a.date!.localeCompare(b.date!));
  const lastDated = past[past.length - 1];
  const since = lastDated ? daysAgo(lastDated.date!) : null;
  const last = [...dates].reverse().find(d => d.feeling || d.likedMore) ?? lastDated;

  const forget = [...(file.dont_forget ?? [])].reverse().slice(0, 5);
  const loves = (file.he_loves ?? []).slice(0, 5);
  const icks = [...(file.icks ?? [])].reverse().slice(0, 2).map(ickText);
  const score = file.report_id && file.safety_score ? SCORE[file.safety_score] : null;

  const line: React.CSSProperties = { fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dark)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  const eyebrow: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 4 };

  return (
    <div className="v-highlights" style={{
      borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)',
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
      maxHeight: focus ? 'calc(100dvh - 32px)' : undefined, overflow: 'hidden',
    }}>
      <style>{`@media print { body * { visibility: hidden !important; } .v-highlights, .v-highlights * { visibility: visible !important; } .v-highlights { position: fixed; inset: 0; margin: 0; box-shadow: none; max-height: none; } }`}</style>

      {/* 1. Who, where it stands, how many, how long since */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--primary-deep)' }}>Before you see him</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)', lineHeight: 1.1, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.nickname || 'Unnamed'}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', marginTop: 3 }}>
            {[file.status ? file.status[0].toUpperCase() + file.status.slice(1) : null,
              count ? `${count} date${count === 1 ? '' : 's'}` : 'No dates yet',
              since === null ? null : since === 0 ? 'last one today' : `last one ${since} day${since === 1 ? '' : 's'} ago`,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        {/* 6. The badge, and nothing else from the report */}
        {score && (
          <span style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 'var(--r-pill)', background: score.bg, color: score.fg, fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {score.label}
          </span>
        )}
      </div>

      {/* 2. Don't forget, most recent first */}
      {forget.length > 0 && (
        <div>
          <div style={eyebrow}>Don&rsquo;t forget</div>
          {forget.map(t => <div key={t} style={line}>· {t}</div>)}
        </div>
      )}

      {/* 3. He loves */}
      {loves.length > 0 && (
        <div>
          <div style={eyebrow}>He loves</div>
          {loves.map(t => <div key={t} style={line}>· {t}</div>)}
        </div>
      )}

      {/* 4. The last date, in her words */}
      {last && (last.feeling || last.likedMore) && (
        <div>
          <div style={eyebrow}>Last time</div>
          {last.feeling && <div style={line}>{FEELING_LABEL[last.feeling] ?? last.feeling}</div>}
          {last.likedMore && <div style={{ ...line, fontStyle: 'italic', color: 'var(--dark-soft)' }}>{last.likedMore}</div>}
        </div>
      )}

      {/* 5. Two latest icks */}
      {icks.length > 0 && (
        <div>
          <div style={{ ...eyebrow, color: 'var(--deeprose-deep)' }}>Latest icks</div>
          {icks.map(t => <div key={t} style={line}>· {t}</div>)}
        </div>
      )}

      {forget.length + loves.length + icks.length === 0 && !last?.feeling && (
        <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', fontWeight: 300, lineHeight: 1.5 }}>
          Nothing here yet. Add what he loves and what not to forget below, and this card fills itself in.
        </div>
      )}

      {focus && (
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }} className="v-no-print">
          <Link href={`/hisfile/${file.id}`} style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--primary-deep)', textDecoration: 'underline' }}>Open the full file</Link>
          <button onClick={() => window.print()} style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', cursor: 'pointer', textDecoration: 'underline' }}>Print</button>
        </div>
      )}
    </div>
  );
}
