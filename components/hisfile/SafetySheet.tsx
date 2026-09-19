'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { HisFile } from '@/lib/hisfile';
import type { FlagPhase } from '@/lib/signals';

/**
 * The full-screen sheet when she tags "he made me feel unsafe". No prices
 * anywhere on it. Split by stage: before the date it is about plans and a
 * friend who knows; during and after, getting out comes first, and the
 * lookup link appears only after, below everything else.
 */

const EXCUSES = [
  "My sister just called, something's happened at home. I have to go.",
  "My friend locked herself out and I've got her spare key. I'm so sorry.",
  "I've got an early start and I'm not feeling well. Let's call it here.",
];
const FRIEND_LINE = 'Call me in 5 minutes, I need a way out.';

const big: React.CSSProperties = { display: 'block', width: '100%', padding: '18px 24px', borderRadius: 'var(--r-pill)', border: 'none', fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' };
const soft: React.CSSProperties = { ...big, background: 'var(--pearl)', color: 'var(--dark)', border: '1.5px solid var(--gold-pale)', fontSize: 16 };
const body: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark)', lineHeight: 1.6, fontWeight: 300, margin: 0 };

async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ text }); return 'shared'; }
  } catch { /* she closed the sheet */ return 'failed'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}

function locationLink(): Promise<string | null> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve(`https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

export function SafetySheet({ stage, file, dateNumber, onClose }: { stage: FlagPhase; file: HisFile; dateNumber: number; onClose: () => void }) {
  const [note, setNote] = useState<string | null>(null);
  const who = file.nickname || 'him';
  const date = (file.dates ?? []).find(d => d.number === dateNumber);
  const where = date?.location || file.meetup_location || file.first_date_location || '';
  const when = date?.date ? new Date(`${date.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  const digits = (file.phone ?? '').replace(/\D/g, '');
  const lookupHref = digits.length >= 10 ? `/search?phone=${encodeURIComponent(digits)}` : '/search';

  const said = (r: 'shared' | 'copied' | 'failed') => setNote(r === 'shared' ? 'Sent.' : r === 'copied' ? 'Copied. Paste it to a friend.' : 'Could not open sharing on this device.');

  const sharePlans = async () => {
    const text = `I'm seeing ${who}${when ? ` on ${when}` : ''}${where ? ` at ${where}` : ''}. Just so someone knows.`;
    said(await shareOrCopy(text));
  };
  const shareLocation = async () => {
    const link = await locationLink();
    const text = `I'm at ${where || 'a date'}.${link ? ` Here's my location: ${link}` : ''}`;
    said(await shareOrCopy(text));
  };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--ivory)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {stage === 'before' ? (
          <>
            <div className="v-eyebrow">Before you go</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(30px,6vw,40px)', fontWeight: 400, lineHeight: 1.08, color: 'var(--dark)', margin: 0, letterSpacing: -0.4 }}>Before you go.</h1>
            <p style={body}>You tagged that {who} made you feel unsafe. A few things worth doing before you see him.</p>
            <button onClick={sharePlans} style={{ ...big, background: 'var(--primary)', color: 'var(--ivory)', boxShadow: 'var(--shadow-pop)' }}>Share my date plans with a friend</button>
            <p style={{ ...body, fontSize: 13, color: 'var(--dark-soft)', marginTop: -8 }}>Where, when, and his name. Sent from your phone, not from us.</p>
            <p style={body}>Meet somewhere public, and keep your own way home.</p>
            <Link href={lookupHref} style={{ ...soft, fontFamily: 'var(--sans)' }}>Check who he is</Link>
          </>
        ) : (
          <>
            <div className="v-eyebrow">Right now</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(30px,6vw,40px)', fontWeight: 400, lineHeight: 1.08, color: 'var(--dark)', margin: 0, letterSpacing: -0.4 }}>Your safety comes first.</h1>
            <p style={body}>If you&rsquo;re in danger right now, call 911.</p>
            <a href="tel:911" style={{ ...big, background: 'var(--deeprose-deep)', color: 'var(--ivory)', boxShadow: 'var(--shadow-pop)', fontSize: 22 }}>Call 911</a>
            <button onClick={shareLocation} style={soft}>Share where I am with a friend</button>
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--gold-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 8 }}>An excuse to leave</div>
              {EXCUSES.map(e => <p key={e} style={{ ...body, fontFamily: 'var(--serif)', fontSize: 16, margin: '0 0 8px' }}>&ldquo;{e}&rdquo;</p>)}
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--pearl)', border: '1px solid var(--gold-pale)' }}>
              <p style={{ ...body, fontFamily: 'var(--serif)', fontSize: 16, margin: '0 0 10px' }}>&ldquo;{FRIEND_LINE}&rdquo;</p>
              <button onClick={async () => said(await shareOrCopy(FRIEND_LINE))} style={{ ...soft, padding: '12px 18px', fontSize: 14, fontFamily: 'var(--sans)' }}>Send this to a friend</button>
            </div>
          </>
        )}
        {note && <p style={{ ...body, fontSize: 13, color: 'var(--sage-deep)' }}>{note}</p>}
        <button onClick={onClose} style={{ ...soft, background: 'transparent', border: 'none', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', textDecoration: 'underline' }}>Close</button>
        {stage === 'after' && (
          <Link href={lookupHref} style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', textDecoration: 'underline', textAlign: 'center', marginTop: 12 }}>
            Check who he is when you&rsquo;re safe.
          </Link>
        )}
      </div>
    </div>
  );
}
