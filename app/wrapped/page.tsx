'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import type { VerityWrapped } from '@/lib/hisfile';

const CURRENT_YEAR = new Date().getFullYear();

function getFirstWedInDec(year: number): Date {
  const dec1 = new Date(year, 11, 1);
  const dayOfWeek = dec1.getDay(); // 0=Sun, 3=Wed
  const daysUntil = (3 - dayOfWeek + 7) % 7;
  return new Date(year, 11, 1 + daysUntil);
}

function formatStoryDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function decemberBannerMsg(year: number): { label: string; sub: string; urgent: boolean } {
  const postDay = getFirstWedInDec(year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  postDay.setHours(0, 0, 0, 0);
  const diffMs = postDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return {
    label: 'Today is the day.',
    sub: `Post your ${year} Verity Wrapped to Instagram Stories right now — ${formatStoryDate(postDay)}.`,
    urgent: true,
  };
  if (diffDays > 0 && diffDays <= 7) return {
    label: `Post in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
    sub: `The first Wednesday of December is ${formatStoryDate(postDay)}. Save your Story card and post then.`,
    urgent: false,
  };
  if (diffDays > 7 && diffDays <= 60) return {
    label: `Mark your calendar — ${formatStoryDate(postDay)}.`,
    sub: `Post your ${year} Verity Wrapped to Stories on the first Wednesday of December.`,
    urgent: false,
  };
  // Past or far future
  return {
    label: 'Share your Wrapped to Instagram Stories.',
    sub: `Next posting day: first Wednesday of December — ${formatStoryDate(getFirstWedInDec(CURRENT_YEAR))}.`,
    urgent: false,
  };
}

async function downloadStoryCard(wrapped: VerityWrapped) {
  await document.fonts.ready;

  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#B41E61');
  bg.addColorStop(0.45, '#7A1E36');
  bg.addColorStop(1, '#1F0A15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative orbs
  const orb1 = ctx.createRadialGradient(W, 0, 0, W, 0, 560);
  orb1.addColorStop(0, 'rgba(255,78,142,0.22)');
  orb1.addColorStop(1, 'rgba(255,78,142,0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, W, H);

  const orb2 = ctx.createRadialGradient(0, H, 0, 0, H, 620);
  orb2.addColorStop(0, 'rgba(200,166,180,0.15)');
  orb2.addColorStop(1, 'rgba(200,166,180,0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, W, H);

  const px = 96; // left margin

  // VERITY wordmark
  ctx.fillStyle = 'rgba(255,210,224,0.55)';
  ctx.font = '500 44px Outfit, -apple-system, sans-serif';
  ctx.fillText('VERITY', px, 140);

  // "Wrapped" large serif italic
  ctx.fillStyle = '#FFD2E0';
  ctx.font = 'italic 300 148px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Wrapped', px - 6, 300);

  // Year
  ctx.fillStyle = 'rgba(255,244,244,0.65)';
  ctx.font = '300 72px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(String(wrapped.year), px, 390);

  // Thin divider line
  ctx.strokeStyle = 'rgba(255,210,224,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, 430);
  ctx.lineTo(W - px, 430);
  ctx.stroke();

  // Big number — total researched
  ctx.fillStyle = '#FFF4F4';
  ctx.font = '300 220px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(String(wrapped.total_searches ?? 0), px - 8, 680);

  ctx.fillStyle = 'rgba(255,210,224,0.65)';
  ctx.font = '300 48px Outfit, -apple-system, sans-serif';
  ctx.fillText('men researched', px, 740);

  // Score row
  const scores = [
    { label: 'GREEN', count: wrapped.green_count ?? 0, color: '#87AE7E' },
    { label: 'YELLOW', count: wrapped.yellow_count ?? 0, color: '#E9B25C' },
    { label: 'RED', count: wrapped.red_count ?? 0, color: '#E7506C' },
  ];
  scores.forEach((s, i) => {
    const x = px + i * 300;
    ctx.fillStyle = s.color;
    ctx.font = '400 100px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(String(s.count), x, 910);
    ctx.fillStyle = 'rgba(255,244,244,0.45)';
    ctx.font = '500 28px Outfit, -apple-system, sans-serif';
    ctx.fillText(s.label, x, 950);
  });

  // Divider
  ctx.strokeStyle = 'rgba(255,210,224,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, 1000);
  ctx.lineTo(W - px, 1000);
  ctx.stroke();

  // Highlight rows
  const highlights = [
    wrapped.most_active_month ? { label: 'MOST ACTIVE MONTH', value: wrapped.most_active_month } : null,
    wrapped.most_common_app ? { label: 'TOP PLATFORM', value: wrapped.most_common_app } : null,
    wrapped.most_common_ick ? { label: 'TOP ICK', value: wrapped.most_common_ick } : null,
    wrapped.average_generosity ? { label: 'AVERAGE GENEROSITY', value: wrapped.average_generosity } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  highlights.slice(0, 4).forEach((h, i) => {
    const y = 1060 + i * 148;
    ctx.fillStyle = 'rgba(255,210,224,0.45)';
    ctx.font = '500 28px Outfit, -apple-system, sans-serif';
    ctx.fillText(h.label, px, y);
    ctx.fillStyle = '#FFF4F4';
    ctx.font = 'italic 400 64px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(h.value, px, y + 72);
  });

  // Headline quote (word-wrapped)
  if (wrapped.headline) {
    ctx.fillStyle = 'rgba(255,210,224,0.7)';
    ctx.font = 'italic 300 40px "Cormorant Garamond", Georgia, serif';
    wrapCanvasText(ctx, `"${wrapped.headline}"`, px, 1680, W - px * 2, 54);
  }

  // Footer
  ctx.fillStyle = 'rgba(255,244,244,0.25)';
  ctx.font = '300 30px Outfit, -apple-system, sans-serif';
  ctx.fillText('verityprive.com · she did her research', px, 1868);

  const link = document.createElement('a');
  link.download = `verity-wrapped-${wrapped.year}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      y += lineHeight;
      line = word + ' ';
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, y);
}

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
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (!wrapped) return;
    setDownloading(true);
    try { await downloadStoryCard(wrapped); } finally { setDownloading(false); }
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

            {/* Instagram Story section */}
            <StorySection wrapped={wrapped} onDownload={handleDownload} downloading={downloading} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
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

function StorySection({ wrapped, onDownload, downloading }: { wrapped: VerityWrapped; onDownload: () => void; downloading: boolean }) {
  const banner = decemberBannerMsg(wrapped.year ?? CURRENT_YEAR);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* December posting suggestion */}
      <div style={{
        padding: '20px 24px', borderRadius: 'var(--r-lg)', marginBottom: 16,
        background: banner.urgent
          ? 'linear-gradient(135deg, var(--primary) 0%, var(--wine) 100%)'
          : 'var(--pearl)',
        boxShadow: banner.urgent ? 'var(--shadow-pop)' : 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div className="v-eyebrow" style={{ color: banner.urgent ? 'var(--blush)' : undefined, marginBottom: 6 }}>
            Post to Instagram Stories
          </div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 400, lineHeight: 1.2,
            color: banner.urgent ? 'var(--ivory)' : 'var(--dark)',
          }}>
            {banner.label}
          </div>
          <div style={{
            fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.5, marginTop: 6, fontWeight: 300,
            color: banner.urgent ? 'rgba(255,244,244,0.8)' : 'var(--dark-soft)',
          }}>
            {banner.sub}
          </div>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{
            padding: '12px 24px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            background: banner.urgent ? 'var(--ivory)' : 'var(--primary)',
            color: banner.urgent ? 'var(--wine)' : 'var(--ivory)',
            fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500,
            whiteSpace: 'nowrap', flexShrink: 0,
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? 'Creating...' : 'Save Story card ↓'}
        </button>
      </div>

      {/* Story card preview */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Mini preview at 9:16 aspect ratio */}
        <div style={{
          width: 140, flexShrink: 0,
          aspectRatio: '9/16',
          borderRadius: 16, overflow: 'hidden',
          background: 'linear-gradient(160deg, #B41E61 0%, #7A1E36 50%, #1F0A15 100%)',
          position: 'relative', boxShadow: 'var(--shadow-md)',
        }}>
          {/* Orb */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,78,142,0.4) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', padding: '14px 12px', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 7, color: 'rgba(255,210,224,0.6)', letterSpacing: 1 }}>VERITY</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: '#FFD2E0', lineHeight: 1, marginTop: 2 }}>Wrapped</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'rgba(255,244,244,0.5)' }}>{wrapped.year}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 34, color: '#FFF4F4', fontWeight: 300, lineHeight: 1, marginTop: 8 }}>{wrapped.total_searches ?? 0}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 7, color: 'rgba(255,210,224,0.6)' }}>men researched</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: '#87AE7E' }}>{wrapped.green_count ?? 0}</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: '#E9B25C' }}>{wrapped.yellow_count ?? 0}</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, color: '#E7506C' }}>{wrapped.red_count ?? 0}</span>
            </div>
            {wrapped.most_common_ick && (
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 5.5, color: 'rgba(255,210,224,0.45)', letterSpacing: 0.5 }}>TOP ICK</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 9, color: '#FFF4F4' }}>{wrapped.most_common_ick}</div>
              </div>
            )}
            <div style={{ fontFamily: 'var(--sans)', fontSize: 5.5, color: 'rgba(255,244,244,0.2)', marginTop: 4 }}>verityprive.com</div>
          </div>
        </div>

        {/* Copy */}
        <div style={{ flex: 1, minWidth: 200, paddingTop: 4 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--dark)', lineHeight: 1.4, marginBottom: 10 }}>
            A 1080×1920 Story card, ready to post.
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', lineHeight: 1.7, fontWeight: 300 }}>
            Download the image, then open Instagram → Stories → add from camera roll. No names, no details — just your year in numbers.
          </div>
          <div style={{ marginTop: 14, fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', lineHeight: 1.6 }}>
            Suggested caption: <em style={{ color: 'var(--dark)' }}>"I did my research this year. Did you? 🌹 verityprive.com"</em>
          </div>
        </div>
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
