'use client';
import { useRef, useState } from 'react';

export function YearSlider({
  year,
  setYear,
  avgAge = 36,
}: {
  year: number;
  setYear: (y: number) => void;
  avgAge?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const stops = [1, 5, 10, 20, 30, 50];

  const moveTo = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setYear(Math.max(1, Math.round(1 + pct * 49)));
  };

  const pct = (year - 1) / 49;

  return (
    <div
      style={{
        background: 'var(--pearl)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 32,
        padding: 'clamp(18px, 3vw, 28px)',
      }}
    >
      <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 16 }}>Horizon</div>

      {/* Big number + context */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--serif)', fontSize: 'clamp(56px, 9vw, 84px)', lineHeight: 0.9,
            fontWeight: 400, color: 'var(--dark)', letterSpacing: -2, fontVariantNumeric: 'tabular-nums',
          }}
        >
          {year}
        </span>
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--gold)', fontWeight: 300 }}>
          {year === 1 ? 'year out' : 'years out'}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
          he&apos;ll be ~{avgAge + year} on avg · {2026 + year}
        </span>
      </div>

      {/* Custom track — pointer + touch driven */}
      <div
        ref={trackRef}
        role="slider"
        aria-label="Years out"
        aria-valuemin={1}
        aria-valuemax={50}
        aria-valuenow={year}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setYear(Math.min(50, year + 1)); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setYear(Math.max(1, year - 1)); }
        }}
        onPointerDown={(e) => {
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => { if (dragging) moveTo(e.clientX); }}
        onPointerUp={(e) => { setDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
        style={{ position: 'relative', height: 40, padding: '16px 0', cursor: 'pointer', touchAction: 'none' }}
      >
        {/* Base line */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 4, transform: 'translateY(-50%)', borderRadius: 2, background: 'var(--ivory-deep)' }} />
        {/* Filled portion */}
        <div style={{ position: 'absolute', left: 0, top: '50%', height: 4, transform: 'translateY(-50%)', borderRadius: 2, width: `${pct * 100}%`, background: 'linear-gradient(90deg, var(--blush) 0%, var(--rose) 100%)' }} />
        {/* Milestone ticks */}
        {stops.map((s) => {
          const sp = (s - 1) / 49;
          return (
            <div
              key={s}
              style={{
                position: 'absolute', left: `${sp * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
                width: 3, height: 10, borderRadius: 1,
                background: s <= year ? 'var(--rose)' : 'var(--mauve)',
                opacity: s === year ? 0 : 0.6,
              }}
            />
          );
        })}
        {/* Thumb */}
        <div
          style={{
            position: 'absolute', left: `${pct * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
            width: 28, height: 28, borderRadius: '50%', background: 'var(--ivory)',
            boxShadow: '0 4px 14px rgba(217,137,124,0.4), inset 0 0 0 2px var(--rose)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rose)' }} />
        </div>
      </div>

      {/* Tappable stop labels */}
      <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
        {stops.map((s) => {
          const sp = (s - 1) / 49;
          return (
            <button
              key={s}
              onClick={() => setYear(s)}
              style={{
                position: 'absolute', left: `${sp * 100}%`, transform: 'translateX(-50%)',
                border: 0, background: 'transparent', padding: '2px 4px', cursor: 'pointer',
                fontFamily: 'var(--sans)', fontSize: 11,
                color: s === year ? 'var(--rose)' : 'var(--mauve-deep)',
                fontWeight: s === year ? 600 : 400, letterSpacing: 0.3, whiteSpace: 'nowrap',
              }}
            >
              {s}y
            </button>
          );
        })}
      </div>
    </div>
  );
}
