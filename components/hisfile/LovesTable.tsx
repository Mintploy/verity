'use client';
import { useState } from 'react';
import { lovesLabel, type LovesEntry } from '@/lib/journal';

/**
 * What he loves, as a small table she fills in: pick "His coffee order"
 * and type "black", pick "His team" and type which one. Suggestions add a
 * row with the label ready and the value waiting; she can also write her
 * own label. Entries saved as plain strings before the value column existed
 * show as a label with an empty value, so nothing she wrote is lost.
 */
export function LovesTable({ items, onChange, suggestions }: {
  items: Array<string | LovesEntry>;
  onChange: (next: LovesEntry[]) => void;
  suggestions: readonly string[];
}) {
  const [draft, setDraft] = useState('');
  const rows: LovesEntry[] = items.map(e => typeof e === 'string' ? { label: e } : e);
  const has = (label: string) => rows.some(r => r.label.toLowerCase() === label.toLowerCase());

  const addLabel = (label: string) => {
    const l = label.trim().replace(/\s+/g, ' ');
    if (!l || has(l)) return;
    onChange([...rows, { label: l, value: '' }]);
  };
  const setValue = (i: number, value: string) => onChange(rows.map((r, j) => j === i ? { ...r, value } : r));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));

  const cell: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)' };
  const input: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--gold-pale)',
    background: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div key={`${r.label}-${i}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) minmax(140px, 2fr) auto', gap: 8, alignItems: 'center' }}>
              <div style={{ ...cell, fontWeight: 500, color: 'var(--sage-deep)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lovesLabel(r)}</div>
              <input
                value={r.value ?? ''}
                onChange={e => setValue(i, e.target.value)}
                placeholder="What is it?"
                maxLength={80}
                style={input}
                autoFocus={i === rows.length - 1 && !r.value}
              />
              <button onClick={() => remove(i)} aria-label={`Remove ${r.label}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-soft)', fontSize: 16, lineHeight: 1, padding: '4px 6px' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(draft); setDraft(''); } }}
          placeholder="Something else he loves..."
          maxLength={60}
          style={{ ...input, flex: 1 }}
        />
        <button onClick={() => { addLabel(draft); setDraft(''); }} style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', background: 'var(--primary)', color: 'var(--ivory)', border: 'none', fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }}>Add</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {suggestions.map(s => {
          const on = has(s);
          return (
            <button key={s} onClick={() => addLabel(s)} disabled={on} style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--gold-pale)', background: on ? 'var(--sage-pale)' : 'var(--pearl)', color: on ? 'var(--sage-deep)' : 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 12, cursor: on ? 'default' : 'pointer', opacity: on ? 0.5 : 1 }}>
              {s}
            </button>
          );
        })}
      </div>
    </>
  );
}
