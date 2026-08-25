'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import { getStarSign } from '@/lib/starsigns';

const SIGN_DESCRIPTIONS: Record<string, string> = {
  Aries:       'Bold and magnetic — you move first and figure it out later.',
  Taurus:      'Sensual and steadfast — you know your worth and you wait for it.',
  Gemini:      'Quick-minded and curious — you see every angle.',
  Cancer:      'Deeply intuitive — you love fiercely and protect what\'s yours.',
  Leo:         'Radiant and generous — you light up every room you walk into.',
  Virgo:       'Perceptive and precise — nothing escapes your eye.',
  Libra:       'Graceful and fair-minded — you make everyone feel seen.',
  Scorpio:     'Intense and magnetic — your depth is your superpower.',
  Sagittarius: 'Free-spirited and honest — you live for the journey.',
  Capricorn:   'Ambitious and composed — you play the long game and win.',
  Aquarius:    'Original and principled — you\'re ahead of your time.',
  Pisces:      'Empathetic and dreamy — you feel what others miss.',
};

const SIGN_EMOJI: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export default function SettingsPage() {
  const router = useRouter();
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sign = dob ? getStarSign(dob) : null;

  useEffect(() => {
    fetch('/api/profile')
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then(d => {
        if (d?.profile?.date_of_birth) setDob(d.profile.date_of_birth);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: dob }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Something went wrong.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
        <Nav />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--dark-soft)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(32px, 6vw, 64px) clamp(16px, 4vw, 32px)' }}>

        <div style={{ marginBottom: 36 }}>
          <div className="v-eyebrow" style={{ marginBottom: 10 }}>Your profile</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--dark)', margin: 0, letterSpacing: -0.5 }}>
            Settings
          </h1>
        </div>

        {/* Birthday card */}
        <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 16 }}>

          {/* Header strip */}
          <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--gold-pale)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--blush-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                🎂
              </div>
              <div>
                <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 2 }}>Birthday</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--dark)', fontWeight: 400 }}>Your date of birth</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Privacy note */}
            <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', lineHeight: 1.65, fontWeight: 300 }}>
              Your birthday stays private. We use it only to calculate compatibility with the men in your files — so you can see at a glance whether the stars are with you on this one.
            </p>

            {/* Date input */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--gold-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 8 }}>
                Date of birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={e => { setDob(e.target.value); setSaved(false); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 'var(--r-md)',
                  border: '1.5px solid var(--gold-pale)', background: 'var(--ivory)',
                  fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Live star sign display */}
            {sign && (
              <div style={{
                padding: '18px 20px', borderRadius: 'var(--r-lg)',
                background: 'linear-gradient(135deg, var(--blush-pale) 0%, var(--ivory-warm) 100%)',
                border: '1px solid var(--gold-pale)',
                display: 'flex', alignItems: 'center', gap: 16,
                animation: 'fadeIn 0.25s ease',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--ivory)', border: '1.5px solid var(--gold-pale)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26,
                }}>
                  {SIGN_EMOJI[sign] ?? '✦'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)', fontWeight: 400, lineHeight: 1.1 }}>
                    {sign}
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--dark-soft)', marginTop: 4, lineHeight: 1.4 }}>
                    {SIGN_DESCRIPTIONS[sign]}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)', fontFamily: 'var(--sans)', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Save button + confirmation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={save}
                disabled={saving || !dob}
                style={{
                  padding: '13px 32px', borderRadius: 'var(--r-pill)',
                  background: !dob ? 'var(--mauve)' : 'var(--primary)',
                  color: 'var(--ivory)', border: 'none',
                  fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500,
                  cursor: dob && !saving ? 'pointer' : 'not-allowed',
                  boxShadow: dob ? 'var(--shadow-pop)' : 'none',
                  opacity: saving ? 0.7 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              {saved && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--sage-deep)',
                  animation: 'fadeIn 0.2s ease',
                }}>
                  <span style={{ fontSize: 16 }}>✓</span>
                  Saved{sign ? ` — compatibility updated across all your files.` : '.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        `}</style>
      </div>
    </div>
  );
}
