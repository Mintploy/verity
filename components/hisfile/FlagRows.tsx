'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  SECTION_LABEL, SIGNALS_V1, UNSAFE_FLAG, personalFlagId, signalFlagId, type Signal,
} from '@/lib/signals';

/**
 * The two chip rows on a date card: her own flags and Verity signals. One
 * tap toggles; the caller saves. Each row shows at most six chips, selected
 * first, then the ones she uses most across her files, with "more" for the
 * rest. Her row is empty until she has set her flags, so it says where.
 *
 * A strong signal she has tapped names the report section that can answer
 * it. Feeling unsafe is handled apart from the rest: no ranking, no
 * counting, one quiet line with somewhere to turn.
 */

const ROW_LIMIT = 6;

type Kind = 'green' | 'red' | 'safety';
interface Chip { id: string; label: string; kind: Kind; signal?: Signal }

const ON: Record<Kind, React.CSSProperties> = {
  green: { border: '1.5px solid var(--sage-deep)', background: 'var(--sage-pale)', color: 'var(--sage-deep)' },
  red: { border: '1.5px solid var(--deeprose-deep)', background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)' },
  safety: { border: '1.5px solid var(--dark)', background: 'var(--dark)', color: 'var(--ivory)' },
};
const OFF: React.CSSProperties = { border: '1.5px solid var(--primary-pale)', background: 'var(--pearl)', color: 'var(--dark-soft)' };

function order(items: Chip[], chosen: string[], usage: Record<string, number>): Chip[] {
  return items
    .map((c, i) => ({ c, i, on: chosen.includes(c.id) ? 1 : 0, use: usage[c.id] ?? 0 }))
    .sort((a, b) => b.on - a.on || b.use - a.use || a.i - b.i)
    .map(x => x.c);
}

function Row({ title, items, chosen, usage, onToggle, emptyNote }: {
  title: string;
  items: Chip[];
  chosen: string[];
  usage: Record<string, number>;
  onToggle: (id: string) => void;
  emptyNote?: React.ReactNode;
}) {
  const [more, setMore] = useState(false);
  const sorted = order(items, chosen, usage);
  const shown = more ? sorted : sorted.slice(0, ROW_LIMIT);
  const hidden = sorted.length - shown.length;
  return (
    <div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--gold-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? emptyNote : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {shown.map(c => {
            const on = chosen.includes(c.id);
            return (
              <button key={c.id} onClick={() => onToggle(c.id)} style={{ ...(on ? ON[c.kind] : OFF), padding: '10px 16px', borderRadius: 'var(--r-pill)', fontFamily: 'var(--sans)', fontSize: 13.5, cursor: 'pointer', textAlign: 'left' }}>
                {on ? '✓ ' : ''}{c.label}
              </button>
            );
          })}
          {hidden > 0 && (
            <button onClick={() => setMore(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--primary-deep)', textDecoration: 'underline', padding: '6px 4px' }}>
              {hidden} more
            </button>
          )}
          {more && sorted.length > ROW_LIMIT && (
            <button onClick={() => setMore(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', textDecoration: 'underline', padding: '6px 4px' }}>
              fewer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FlagRows({ chosen, onToggle, personal, usage, reportId }: {
  chosen: string[];
  onToggle: (id: string) => void;
  personal: { green: string[]; red: string[] };
  /** How often she has tapped each id across all her files. Orders the rows. */
  usage: Record<string, number>;
  /** His report, if one is attached; strong signals link to it. */
  reportId?: string;
}) {
  const mine: Chip[] = [
    ...personal.green.map(t => ({ id: personalFlagId('green', t), label: t, kind: 'green' as Kind })),
    ...personal.red.map(t => ({ id: personalFlagId('red', t), label: t, kind: 'red' as Kind })),
  ];
  const signals: Chip[] = SIGNALS_V1.map(s => ({
    id: signalFlagId(s.id), label: s.label, signal: s,
    kind: (s.tier === 'green' ? 'green' : s.tier === 'safety' ? 'safety' : 'red') as Kind,
  }));

  const strongOn = signals.filter(c => chosen.includes(c.id) && c.signal?.tier === 'strong' && c.signal.answeredBy.length);
  const unsafeOn = chosen.includes(UNSAFE_FLAG);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Row
        title="Yours"
        items={mine}
        chosen={chosen}
        usage={usage}
        onToggle={onToggle}
        emptyNote={
          <Link href="/settings" style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--primary-deep)', textDecoration: 'underline' }}>
            Set your own green and red flags in Settings, and they show up here.
          </Link>
        }
      />
      <Row title="Verity signals" items={signals} chosen={chosen} usage={usage} onToggle={onToggle} />
      {strongOn.length > 0 && (
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', lineHeight: 1.5 }}>
          {strongOn.map(c => (
            <div key={c.id}>
              <span style={{ color: 'var(--deeprose-deep)' }}>{c.label}</span>: a report&rsquo;s {c.signal!.answeredBy.map(s => SECTION_LABEL[s]).join(', ')} can answer this.
            </div>
          ))}
          {reportId && <Link href={`/report/${reportId}`} style={{ color: 'var(--primary-deep)', textDecoration: 'underline' }}>Open his report</Link>}
        </div>
      )}
      {unsafeOn && (
        <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--pearl)', border: '1px solid var(--gold-pale)', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark)', lineHeight: 1.55 }}>
          Noted, just for you. If you are in danger, call 911. The National Domestic Violence Hotline is 1-800-799-7233, any hour, and can talk through anything else.
        </div>
      )}
    </div>
  );
}
