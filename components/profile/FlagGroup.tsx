'use client';
import { useState } from 'react';
import { FLAG_MAX_LENGTH, PERSONAL_FLAG_MAX_CUSTOM, PERSONAL_FLAG_MAX_PICKS } from '@/lib/flags';

/**
 * One group of her personal standards as tap-to-keep chips, with one line
 * to add her own. Used by the welcome flow and by Settings, so both keep the
 * same limits: up to five picks from the examples and one of her own.
 */
export function FlagGroup({ label, tone, chosen, suggestions, onChange, hint }: {
  label: string;
  tone: 'green' | 'red';
  chosen: string[];
  suggestions: readonly string[];
  onChange: (next: string[]) => void;
  hint?: string;
}) {
  const [custom, setCustom] = useState('');
  const has = (t: string) => chosen.some(c => c.toLowerCase() === t.toLowerCase());
  const isSuggested = (t: string) => suggestions.some(s => s.toLowerCase() === t.toLowerCase());
  const picks = chosen.filter(isSuggested).length;
  const customs = chosen.filter(c => !isSuggested(c)).length;
  const pickFull = picks >= PERSONAL_FLAG_MAX_PICKS;
  const customFull = customs >= PERSONAL_FLAG_MAX_CUSTOM;

  const toggle = (t: string) => {
    if (has(t)) return onChange(chosen.filter(c => c.toLowerCase() !== t.toLowerCase()));
    if (isSuggested(t) ? pickFull : customFull) return;
    onChange([...chosen, t]);
  };
  const add = () => {
    const t = custom.trim().replace(/\s+/g, ' ').slice(0, FLAG_MAX_LENGTH);
    if (t && !has(t)) toggle(t);
    setCustom('');
  };
  const on = tone === 'green'
    ? { border: '1.5px solid var(--sage-deep)', background: 'var(--sage-pale)', color: 'var(--sage-deep)' }
    : { border: '1.5px solid var(--deeprose-deep)', background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)' };
  const off = { border: '1.5px solid var(--gold-pale)', background: 'var(--ivory)', color: 'var(--dark-soft)' };
  const all = [...chosen, ...suggestions.filter(sg => !has(sg))];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <label style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--gold-deep)', letterSpacing: 0.2, textTransform: 'uppercase' }}>
          {label}
        </label>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--mauve-deep)' }}>{picks} of {PERSONAL_FLAG_MAX_PICKS}</span>
      </div>
      {hint && <p style={{ margin: '0 0 10px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', fontWeight: 300, lineHeight: 1.5 }}>{hint}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {all.map(t => {
          const selected = has(t);
          const blocked = !selected && (isSuggested(t) ? pickFull : customFull);
          return (
            <button key={t} onClick={() => toggle(t)} disabled={blocked} style={{ ...(selected ? on : off), padding: '8px 14px', borderRadius: 'var(--r-pill)', fontFamily: 'var(--sans)', fontSize: 13, cursor: blocked ? 'default' : 'pointer', opacity: blocked ? 0.45 : 1 }}>
              {selected ? '✓ ' : ''}{t}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={customFull ? 'Your own one is in. Remove it to write another.' : 'One of your own...'}
          disabled={customFull}
          maxLength={FLAG_MAX_LENGTH}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--gold-pale)', background: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)', outline: 'none', opacity: customFull ? 0.6 : 1 }}
        />
        <button onClick={add} disabled={!custom.trim() || customFull} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--sans)', fontSize: 13, cursor: custom.trim() && !customFull ? 'pointer' : 'not-allowed', opacity: custom.trim() && !customFull ? 1 : 0.5 }}>
          Add
        </button>
      </div>
    </div>
  );
}
