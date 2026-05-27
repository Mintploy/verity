'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle } from '@/components/ui/Sparkle';

export function Hero() {
  const [phone, setPhone] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (phone.trim()) {
      router.push(`/search?phone=${encodeURIComponent(phone)}`);
    } else {
      router.push('/verify');
    }
  };

  return (
    <section className="v-section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -100, right: -150, width: 500, height: 500,
        background: 'radial-gradient(circle, var(--blush) 0%, transparent 65%)', opacity: 0.5,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 200, left: -80, width: 300, height: 300,
        background: 'radial-gradient(circle, var(--champagne) 0%, transparent 70%)', opacity: 0.5,
        pointerEvents: 'none',
      }} />

      <div className="v-grid-hero v-max" style={{ position: 'relative', zIndex: 1 }}>
        <div>
          <span className="v-sticker" style={{ marginBottom: 28, display: 'inline-flex' }}>
            <Sparkle size={11} color="var(--wine)" /> private intelligence, for her
          </span>

          <h1 className="v-display-xl v-serif" style={{
            fontWeight: 400, color: 'var(--dark)', margin: '28px 0 0',
          }}>
            Know him<br />
            <em style={{ color: 'var(--primary)', fontWeight: 300 }}>before</em> you<br />
            meet him<span style={{ color: 'var(--primary)' }}>.</span>
          </h1>

          <p style={{
            fontFamily: 'var(--sans)', fontSize: 'clamp(15px, 2vw, 19px)', lineHeight: 1.55,
            color: 'var(--dark-soft)', margin: '36px 0 0', maxWidth: 480, fontWeight: 300,
          }}>
            Verity is private intelligence for the woman who's done taking unnecessary risks.
            Drop in a phone number. Get back the full picture — quietly, in seconds.
          </p>

          <div className="v-hero-pill" style={{
            marginTop: 36, padding: 8,
            background: 'var(--pearl)', borderRadius: 'var(--r-pill)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', flex: 1, minWidth: 0 }}>
              <span style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16,
                color: 'var(--mauve-deep)', marginRight: 12, whiteSpace: 'nowrap',
              }}>His number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="(•••) ••• ••••"
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)',
                  fontVariantNumeric: 'tabular-nums', minWidth: 0, width: '100%',
                }}
              />
            </div>
            <button onClick={handleSearch} className="v-hero-pill-btn" style={{
              padding: '16px 28px', borderRadius: 'var(--r-pill)',
              background: 'var(--primary)', color: 'var(--ivory)', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: 'var(--shadow-pop)',
            }}>
              Get the report <em style={{ fontWeight: 300, marginLeft: 2 }}>→</em>
            </button>
          </div>

          <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--mauve-deep)', marginTop: 16, letterSpacing: 0.3 }}>
            Verified women only · Your search stays private · He'll never know
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 36 }}>
            <div className="v-hide-mobile" style={{ display: 'flex' }}>
              {['var(--blush-deep)', 'var(--champagne)', 'var(--mauve)', 'var(--sage)', 'var(--rose)'].map((c, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: '2.5px solid var(--ivory)', marginLeft: i ? -10 : 0,
                }} />
              ))}
            </div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)', lineHeight: 1.4 }}>
              <strong style={{ fontWeight: 600, color: 'var(--dark)' }}>47,232 women</strong> already verified ·{' '}
              <em style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>her circle</em>
            </div>
          </div>
        </div>

        <div className="v-hide-mobile">
          <SampleReportCard />
        </div>
      </div>
    </section>
  );
}

function SampleReportCard() {
  return (
    <div style={{ position: 'relative', maxWidth: 460, marginLeft: 'auto' }}>
      <div style={{
        position: 'absolute', inset: 0, transform: 'translate(16px, 16px) rotate(2deg)',
        background: 'var(--ivory-warm)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, transform: 'translate(8px, 8px) rotate(1deg)',
        background: 'var(--champagne)', opacity: 0.6, borderRadius: 'var(--r-xl)',
      }} />

      <div style={{
        position: 'relative', borderRadius: 'var(--r-xl)',
        background: 'var(--pearl)', padding: 28, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span className="v-eyebrow" style={{ fontSize: 10 }}>Sample report</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 'var(--r-pill)', background: 'var(--honey-pale)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--honey-deep)' }} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--honey-deep)', fontWeight: 500, letterSpacing: 0.3 }}>Soft yellow</span>
          </div>
        </div>

        <div style={{
          padding: '20px 22px', background: 'var(--honey-pale)', borderRadius: 'var(--r-lg)', marginBottom: 18,
        }}>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--honey-deep)', lineHeight: 1.15 }}>
            "A few things to weigh."
          </div>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark)', margin: '8px 0 0', lineHeight: 1.55, fontWeight: 300 }}>
            Marcus is who he says he is — but the file isn't spotless. A secondary VoIP line and one open civil matter warrant a slower pace.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--ivory-warm), var(--champagne))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dark-soft)',
          }}>MA</div>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)' }}>Marcus Anderson</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--dark-soft)' }}>Age 41 · Scottsdale, AZ · (415) 555-0142</div>
          </div>
        </div>

        <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 10 }}>Key findings · 3 of 7 sections</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Phone', val: 'T-Mobile · 3 years', flag: false },
            { label: 'Public records', val: '1 open civil suit · 2024', flag: true },
            { label: 'Social', val: 'Age discrepancy on X', flag: true },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 14px', background: 'var(--ivory)', borderRadius: 'var(--r-md)',
            }}>
              <span className="v-eyebrow" style={{ fontSize: 9.5, color: 'var(--mauve-deep)' }}>{r.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.flag && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--honey-deep)' }} />}
                <span style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark)' }}>{r.val}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 18, padding: '12px 14px',
          background: 'var(--ivory-warm)', borderRadius: 'var(--r-md)',
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--dark)', lineHeight: 1.5,
        }}>
          "Go in with eyes open, ask about the lawsuit, daytime first meeting."
          <div style={{ fontFamily: 'var(--sans)', fontStyle: 'normal', fontSize: 10.5, color: 'var(--mauve-deep)', marginTop: 6, letterSpacing: 0.3 }}>
            VERITY'S RECOMMENDATION
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: -16, left: -28,
        padding: '8px 16px', background: 'var(--blush)',
        borderRadius: 'var(--r-pill)', boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--wine)',
        transform: 'rotate(-6deg)',
      }}>
        what we'd ask him
      </div>

      <div style={{
        position: 'absolute', bottom: 24, right: -36,
        padding: '8px 14px', background: 'var(--pearl)',
        borderRadius: 'var(--r-pill)', boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--dark)',
        transform: 'rotate(4deg)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Sparkle size={10} color="var(--primary)" />
        <span>generated in 14s</span>
      </div>
    </div>
  );
}
