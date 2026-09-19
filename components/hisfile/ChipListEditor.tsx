'use client';
import { useState } from 'react';

/**
 * A list of short strings as chips, with type-and-Enter to add and one-tap
 * suggestions. The Ick section, He loves, I noticed and Don't forget all use
 * this one component; a new suggestion list appears everywhere the moment it
 * is added to the constant that feeds it.
 *
 * `meta` lets a caller show a small trailer on a chip (the Ick section shows
 * which date and topic). Adding and removing are the caller's; this only
 * renders and collects.
 */

export type ChipTone = 'red' | 'rose' | 'sage' | 'gold';

const TONES: Record<ChipTone, { bg: string; fg: string }> = {
  red: { bg: 'var(--deeprose-pale)', fg: 'var(--deeprose-deep)' },
  rose: { bg: 'var(--primary-mist)', fg: 'var(--primary-deep)' },
  sage: { bg: 'var(--sage-pale)', fg: 'var(--sage-deep)' },
  gold: { bg: 'var(--blush-pale)', fg: 'var(--gold-deep)' },
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--gold-pale)', background: 'var(--ivory)',
  fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)',
  outline: 'none', boxSizing: 'border-box',
};

export function ChipListEditor({ items, onAdd, onRemove, suggestions = [], placeholder, tone, meta, maxLength = 120 }: {
  items: string[];
  onAdd: (text: string) => void;
  onRemove: (text: string) => void;
  suggestions?: readonly string[];
  placeholder: string;
  tone: ChipTone;
  meta?: (text: string) => string;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState('');
  const t = TONES[tone];
  const has = (s: string) => items.some(i => i.toLowerCase() === s.toLowerCase());
  const submit = () => {
    const v = draft.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (!has(v)) onAdd(v);
    setDraft('');
  };

  return (
    <>
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {items.map(text => {
            const m = meta?.(text) ?? '';
            return (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--r-pill)', background: t.bg, color: t.fg, fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500 }}>
                {text}
                {m && <span style={{ fontWeight: 300, opacity: 0.8 }}>· {m}</span>}
                <button onClick={() => onRemove(text)} aria-label={`Remove ${text}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.fg, padding: '0 0 0 2px', fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder={placeholder}
          maxLength={maxLength}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={submit} style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', background: 'var(--primary)', color: 'var(--ivory)', border: 'none', fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }}>Add</button>
      </div>
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {suggestions.map(s => {
            const on = has(s);
            return (
              <button key={s} onClick={() => { if (!on) onAdd(s); }} disabled={on} style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--gold-pale)', background: on ? t.bg : 'var(--pearl)', color: on ? t.fg : 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 12, cursor: on ? 'default' : 'pointer', opacity: on ? 0.5 : 1 }}>
                {s}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
