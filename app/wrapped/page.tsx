'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import type { VerityWrapped } from '@/lib/hisfile';

const CURRENT_YEAR = new Date().getFullYear();

function scoreBar({ green = 0, yellow = 0, red = 0 }: { green?: number; yellow?: number; red?: number }) {
  const total = green + yellow + red;
  if (!total) return null;
  return (
    <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 12, gap: 2 }}>
      {green > 0 && <div style={{ flex: green, background: 'var(--sage)', borderRadius: 3 }} title={`${green} green`} />}
      {yellow > 0 && <div style={{ flex: yellow, background: 'var(--honey)', borderRadius: 3 }} title={`${yellow} yellow`} />}
      {red > 0 && <div style={{ flex: red, background: 'var(--deeprose)', borderRadius: 3 }} title={`${red} red`} />}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ padding: '22px 20px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="v-eyebrow">{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, color: 'var(--dark)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)', opacity: 0.65, fontWeight: 300 }}>{sub}</div>}
    </div>
  );
}

export default function WrappedPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(false);
  const [wrapped, setWrapped] = useState<VerityWrapped | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wrapped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      if (res.status === 404) { setError(`No research found for ${year}.`); return; }
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      setWrapped(data.wrapped);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(24px, 4vw, 56px) clamp(16px, 4vw, 32px)' }}>

        {!generated ? (
          /* Pre-generation hero */
          <div style={{ textAlign: 'center', paddingTop: 'clamp(32px, 6vw, 72px)' }}>
            <div className="v-eyebrow" style={{ marginBottom: 16 }}>Your year in review</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 400, lineHeight: 1.0, color: 'var(--dark)', margin: '0 0 20px', letterSpacing: -1 }}>
              Verity <em style={{ color: 'var(--primary)' }}>Wrapped</em>
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 17, color: 'var(--dark-soft)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 40px', fontWeight: 300 }}>
              See your research year at a glance — who you vetted, what patterns you found, and what the data says about your dating year.
            </p>

            {/* Year selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 36 }}>
              <button
                onClick={() => setYear(y => y - 1)}
                disabled={year <= CURRENT_YEAR - 5}
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--gold-pale)', background: 'var(--pearl)', color: 'var(--dark)', fontFamily: 'var(--serif)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</button>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 400, color: 'var(--dark)', letterSpacing: -1, minWidth: 120, textAlign: 'center' }}>{year}</div>
              <button
                onClick={() => setYear(y => y + 1)}
                disabled={year >= CURRENT_YEAR}
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--gold-pale)', background: 'var(--pearl)', color: 'var(--dark)', fontFamily: 'var(--serif)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</button>
            </div>

            {error && (
              <div style={{ padding: '14px 20px', borderRadius: 'var(--r-md)', background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)', fontFamily: 'var(--sans)', fontSize: 14, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                {error}
              </div>
            )}

            <button onClick={generate} disabled={loading} style={{
              padding: '16px 40px', borderRadius: 'var(--r-pill)',
              background: loading ? 'var(--mauve)' : 'var(--primary)', color: 'var(--ivory)',
              border: 'none', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-pop)', letterSpacing: 0.2,
            }}>
              {loading ? 'Generating...' : `Generate ${year} Wrapped`}
            </button>

            <div style={{ marginTop: 48 }}>
              <Link href="/hisfile" style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', opacity: 0.6, textDecoration: 'none' }}>
                ← Back to His File
              </Link>
            </div>
          </div>
        ) : wrapped && (
          /* Results */
          <div>
            {/* Headline gradient card */}
            <div style={{
              borderRadius: 'var(--r-xl)', overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--primary-deep) 0%, var(--wine) 50%, var(--dark) 100%)',
              padding: 'clamp(32px, 5vw, 52px)',
              marginBottom: 28, position: 'relative',
              boxShadow: 'var(--shadow-pop)',
            }}>
              <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary) 0%, transparent 65%)', opacity: 0.2 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="v-eyebrow" style={{ color: 'var(--blush)', marginBottom: 12 }}>Verity Wrapped · {wrapped.year}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 400, color: 'var(--ivory)', lineHeight: 1.2, marginBottom: 20 }}>
                  <em style={{ color: 'var(--blush)' }}>"</em>{wrapped.headline}<em style={{ color: 'var(--blush)' }}>"</em>
                </div>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Researched', val: wrapped.total_searches },
                    { label: 'Green', val: wrapped.green_count, color: 'var(--sage)' },
                    { label: 'Yellow', val: wrapped.yellow_count, color: 'var(--honey)' },
                    { label: 'Red', val: wrapped.red_count, color: 'var(--deeprose)' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 400, color: color ?? 'var(--ivory)', lineHeight: 1 }}>{val ?? 0}</div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ivory)', opacity: 0.6, marginTop: 4, letterSpacing: 0.3 }}>{label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Safety breakdown bar */}
            <div style={{ padding: '20px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
              <div className="v-eyebrow" style={{ marginBottom: 12 }}>Safety score breakdown</div>
              {scoreBar({ green: wrapped.green_count, yellow: wrapped.yellow_count, red: wrapped.red_count })}
              <div style={{ display: 'flex', gap: 20, marginTop: 12, fontFamily: 'var(--sans)', fontSize: 12 }}>
                <span style={{ color: 'var(--sage-deep)' }}>● {wrapped.green_count ?? 0} green</span>
                <span style={{ color: 'var(--honey-deep)' }}>● {wrapped.yellow_count ?? 0} yellow</span>
                <span style={{ color: 'var(--deeprose-deep)' }}>● {wrapped.red_count ?? 0} red</span>
              </div>
            </div>

            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              {wrapped.most_active_month && <StatCard label="Most active month" value={wrapped.most_active_month} sub="peak research season" />}
              {wrapped.most_common_app && <StatCard label="Top platform" value={wrapped.most_common_app} sub="where you found them" />}
              {wrapped.average_generosity && <StatCard label="Avg. generosity" value={wrapped.average_generosity} sub="across all dates" />}
              {wrapped.most_common_ick && <StatCard label="Top ick" value={wrapped.most_common_ick} sub="recurring red flag" />}
            </div>

            {/* Star sign breakdown */}
            {wrapped.star_sign_breakdown && Object.keys(wrapped.star_sign_breakdown).length > 0 && (
              <div style={{ padding: '20px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
                <div className="v-eyebrow" style={{ marginBottom: 16 }}>Star sign breakdown</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {Object.entries(wrapped.star_sign_breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([sign, count]) => (
                      <div key={sign} style={{
                        padding: '8px 16px', borderRadius: 'var(--r-pill)',
                        background: 'var(--ivory-warm)', fontFamily: 'var(--sans)', fontSize: 13,
                        color: 'var(--dark)', display: 'flex', gap: 8, alignItems: 'center',
                      }}>
                        <span>{signEmoji(sign)}</span>
                        <span style={{ fontWeight: 500 }}>{sign}</span>
                        <span style={{ opacity: 0.5 }}>×{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Status breakdown */}
            {wrapped.status_breakdown && Object.keys(wrapped.status_breakdown).length > 0 && (
              <div style={{ padding: '20px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
                <div className="v-eyebrow" style={{ marginBottom: 16 }}>Where they ended up</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {Object.entries(wrapped.status_breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div key={status} style={{
                        padding: '8px 16px', borderRadius: 'var(--r-pill)',
                        background: 'var(--blush-pale)', fontFamily: 'var(--sans)', fontSize: 13,
                        color: 'var(--wine)', textTransform: 'capitalize',
                        display: 'flex', gap: 8, alignItems: 'center',
                      }}>
                        <span style={{ fontWeight: 500 }}>{status}</span>
                        <span style={{ opacity: 0.6 }}>×{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => { setWrapped(null); setGenerated(false); }} style={{
                padding: '12px 24px', borderRadius: 'var(--r-pill)',
                background: 'var(--pearl)', border: '1.5px solid var(--gold-pale)',
                color: 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 14, cursor: 'pointer',
              }}>
                ← Regenerate
              </button>
              <Link href="/hisfile" style={{
                padding: '12px 24px', borderRadius: 'var(--r-pill)',
                background: 'var(--primary)', color: 'var(--ivory)',
                fontFamily: 'var(--serif)', fontSize: 15, textDecoration: 'none',
                boxShadow: 'var(--shadow-pop)',
              }}>
                Back to His File
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function signEmoji(sign: string): string {
  const map: Record<string, string> = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };
  return map[sign] ?? '✦';
}
