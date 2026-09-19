'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { FlagGroup } from '@/components/profile/FlagGroup';
import { PERSONAL_FLAGS_VERSION, PERSONAL_GREEN_EXAMPLES, PERSONAL_RED_EXAMPLES } from '@/lib/flags';
import { getStarSign } from '@/lib/starsigns';

/**
 * Two screens, once, right after her first sign-in. Both can be skipped and
 * neither comes back once she has finished or skipped the flow: the profile
 * remembers (onboarded_at). Existing members reach it from a banner on His
 * File instead of being sent here.
 *
 * Nothing on these screens sells anything.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 83 }, (_, i) => THIS_YEAR - 18 - i);

const selectStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--gold-pale)',
  background: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark)', outline: 'none',
};
const primary: React.CSSProperties = {
  padding: '14px 32px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)',
  border: 'none', fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-pop)',
};
const ghost: React.CSSProperties = {
  padding: '14px 20px', borderRadius: 'var(--r-pill)', background: 'transparent', color: 'var(--dark-soft)',
  border: 'none', fontFamily: 'var(--sans)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline',
};

export default function WelcomePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<1 | 2>(1);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [green, setGreen] = useState<string[]>([]);
  const [red, setRed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Already done or skipped: nothing to show, straight to her files.
  useEffect(() => {
    fetch('/api/profile')
      .then(r => { if (r.status === 401) { router.replace('/login'); return null; } return r.json(); })
      .then(d => { if (d?.profile?.onboarded_at) router.replace('/hisfile'); })
      .catch(() => {});
  }, [router]);

  const dob = month && day && year ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
  const validDob = !!dob && !Number.isNaN(new Date(`${dob}T00:00:00`).getTime()) && new Date(`${dob}T00:00:00`).getDate() === Number(day);
  const sign = validDob ? getStarSign(dob) : null;

  const post = (body: Record<string, unknown>) =>
    fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const saveBirthday = async () => {
    if (!validDob) { setScreen(2); return; }
    setBusy(true);
    try { await post({ date_of_birth: dob }); } catch {} finally { setBusy(false); }
    setScreen(2);
  };

  const finish = async (withFlags: boolean) => {
    setBusy(true);
    try {
      await post(withFlags && (green.length || red.length)
        ? { personal_flags: { green, red, version: PERSONAL_FLAGS_VERSION }, onboarded: true }
        : { onboarded: true });
    } catch {} finally { setBusy(false); }
    router.replace('/hisfile');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark size={24} color="var(--dark)" />
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', letterSpacing: 0.4 }}>{screen} of 2</div>
      </div>

      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '24px 24px 80px', boxSizing: 'border-box' }}>
        {screen === 1 ? (
          <>
            <div className="v-eyebrow" style={{ marginBottom: 10 }}>Welcome</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(30px,5vw,42px)', fontWeight: 400, lineHeight: 1.08, color: 'var(--dark)', margin: 0, letterSpacing: -0.4 }}>
              When is your birthday?
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)', margin: '12px 0 28px', fontWeight: 300, lineHeight: 1.6 }}>
              We use it for your star sign, and nothing else.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr', gap: 10 }}>
              <select value={month} onChange={e => setMonth(e.target.value)} style={selectStyle} aria-label="Month">
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
              </select>
              <select value={day} onChange={e => setDay(e.target.value)} style={selectStyle} aria-label="Day">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
              </select>
              <select value={year} onChange={e => setYear(e.target.value)} style={selectStyle} aria-label="Year">
                <option value="">Year</option>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <div style={{ minHeight: 28, marginTop: 14, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--gold-deep)' }}>
              {sign ? `A ${sign}. Lovely.` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, flexWrap: 'wrap' }}>
              <button onClick={saveBirthday} disabled={busy || !validDob} style={{ ...primary, opacity: validDob ? 1 : 0.5, cursor: validDob ? 'pointer' : 'not-allowed' }}>Continue</button>
              <button onClick={() => setScreen(2)} disabled={busy} style={ghost}>Skip for now</button>
            </div>
          </>
        ) : (
          <>
            <div className="v-eyebrow" style={{ marginBottom: 10 }}>One more thing</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(30px,5vw,42px)', fontWeight: 400, lineHeight: 1.08, color: 'var(--dark)', margin: 0, letterSpacing: -0.4 }}>
              What matters to you?
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)', margin: '12px 0 28px', fontWeight: 300, lineHeight: 1.6 }}>
              Your standards, in your words. They become one-tap notes on a date, and you can change them any time in Settings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              <FlagGroup label="Green flags" tone="green" chosen={green} suggestions={PERSONAL_GREEN_EXAMPLES} onChange={setGreen} hint="What you want more of." />
              <FlagGroup label="Red flags" tone="red" chosen={red} suggestions={PERSONAL_RED_EXAMPLES} onChange={setRed} hint="What you will not put up with." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
              <button onClick={() => finish(true)} disabled={busy} style={primary}>{busy ? 'Saving...' : 'Done'}</button>
              <button onClick={() => finish(false)} disabled={busy} style={ghost}>Skip for now</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
