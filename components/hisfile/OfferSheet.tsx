'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { HisFile } from '@/lib/hisfile';
import type { OfferPayload } from '@/lib/upsell';
import { setPendingPhone } from '@/lib/pending';

/**
 * The bottom sheet for a STRONG or STACKED trigger: names what she tagged
 * and the report section that answers it, then offers by plan. A nudge for
 * a member with credits; the $19 single report otherwise; membership only
 * as a second line for a free user, and never the annual plan here.
 *
 * Copy rules: the verb is "shows". No promise of safety, no fear, no
 * timers, no counts of other women.
 */

const SHEET_LINE: Record<string, string> = {
  story_mismatch: 'A report shows every address linked to him, with dates.',
  no_last_name: 'A report shows the names and employers tied to his number.',
  money: 'A report shows bankruptcies, liens and judgments on record, and his work history.',
  off_app_fast: 'A report shows whether his number is a real carrier line or a throwaway, and who it belongs to.',
  no_footprint: 'A report shows who his number belongs to and where else he appears.',
};
const STACK_LINE = 'A report shows the public record: who his number belongs to, where he has lived, and what is on file.';

const primary: React.CSSProperties = { display: 'block', width: '100%', padding: '15px 22px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', border: 'none', fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500, cursor: 'pointer', boxShadow: 'var(--shadow-pop)', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' };
const secondary: React.CSSProperties = { ...primary, background: 'var(--pearl)', color: 'var(--dark)', border: '1.5px solid var(--gold-pale)', boxShadow: 'none', fontSize: 15, fontFamily: 'var(--sans)' };
const quiet: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', textDecoration: 'underline', padding: 6 };
const body: React.CSSProperties = { fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark)', lineHeight: 1.6, fontWeight: 300, margin: 0 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--gold-pale)', background: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark)', outline: 'none', boxSizing: 'border-box' };

function tomorrowMorning(): string {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function OfferSheet({ offer, file, onClose, onSavePhone, onNoOffers }: {
  offer: OfferPayload;
  file: HisFile;
  onClose: () => void;
  /** Saves his number to the file (encrypted with the rest). Resolves when saved. */
  onSavePhone: (digits: string) => Promise<void>;
  onNoOffers: () => Promise<void>;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [askPhone, setAskPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);

  const logEvent = (outcome: 'dismissed' | 'checkout_started' | 'reminded') =>
    fetch('/api/upsell/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: offer.tier, stage: offer.stage, outcome }) }).catch(() => {});

  const hasCredits = offer.remaining === -1 || offer.remaining > 0;
  const isFree = offer.plan === 'free';
  const needsPurchase = !hasCredits;
  const needsId = needsPurchase && !offer.identityVerified;

  const title = offer.tier === 'strong'
    ? offer.labels[0]
    : offer.stacked === 'weak' ? 'Two signals on one date' : 'Three red flags on one date';
  const line = offer.tier === 'strong' ? (SHEET_LINE[offer.signalId ?? ''] ?? STACK_LINE) : STACK_LINE;

  const buttonLabel = !needsPurchase
    ? offer.plan === 'single' ? 'Check him now (uses your report)'
      : offer.remaining === -1 ? 'Check him now'
      : `Check him now (uses 1 of your ${offer.remaining} this month)`
    : 'Check him now, $19 for one report';

  const fileDigits = (file.phone ?? '').replace(/\D/g, '');

  const proceed = async (digits: string) => {
    setBusy(true); setError(null);
    try {
      if (!needsPurchase) {
        router.push(`/search?phone=${encodeURIComponent(digits)}`);
        return;
      }
      await logEvent('checkout_started');
      setPendingPhone(digits);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'single', upsell: { tier: offer.tier, stage: offer.stage }, returnUrl: window.location.href }),
      });
      const d = await res.json();
      if (d.url) { window.location.href = d.url; return; }
      if (d.redirect) { router.push(d.redirect); return; }
      setError(d.error ?? 'Could not start checkout.');
    } finally { setBusy(false); }
  };

  const checkNow = async () => {
    if (fileDigits.length >= 10) return proceed(fileDigits);
    setAskPhone(true);
  };

  const submitPhone = async () => {
    const digits = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (digits.length !== 10) { setError('A 10-digit US number, please.'); return; }
    setBusy(true);
    try { await onSavePhone(digits); } catch { setError('Could not save his number.'); setBusy(false); return; }
    await proceed(digits);
  };

  const remind = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/reminder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'after_date', file_id: file.id, subject_name: file.nickname || null, due_at: tomorrowMorning() }),
      });
      if (!res.ok) throw new Error();
      await logEvent('reminded');
      setReminded(true);
    } catch { setError('Could not set the reminder.'); } finally { setBusy(false); }
  };

  const dismiss = async () => { await logEvent('dismissed'); onClose(); };
  const never = async () => { await logEvent('dismissed'); await onNoOffers(); onClose(); };

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(43,20,24,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={dismiss}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: 'var(--ivory)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '22px 24px 32px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '90dvh', overflowY: 'auto' }}>
        {reminded ? (
          <>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, color: 'var(--dark)', margin: 0, lineHeight: 1.1 }}>We&rsquo;ll remind you tomorrow morning.</h2>
            <p style={body}>Your notes are saved.</p>
            <button onClick={onClose} style={secondary}>Close</button>
          </>
        ) : askPhone ? (
          <>
            <div className="v-eyebrow">One thing first</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 400, color: 'var(--dark)', margin: 0, lineHeight: 1.15 }}>His number, so the report is about the right man.</h2>
            <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="(415) 555 0100" style={inputStyle} autoFocus />
            <p style={{ ...body, fontSize: 12.5, color: 'var(--dark-soft)' }}>Saved to his file, encrypted like the rest.</p>
            {error && <p style={{ ...body, color: 'var(--deeprose-deep)' }}>{error}</p>}
            <button onClick={submitPhone} disabled={busy} style={primary}>{busy ? 'One moment...' : 'Continue'}</button>
            <button onClick={() => setAskPhone(false)} style={quiet}>Back</button>
          </>
        ) : (
          <>
            <div className="v-eyebrow">You tagged</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, color: 'var(--dark)', margin: 0, lineHeight: 1.1 }}>{title}</h2>
            {offer.tier === 'stacked' && (
              <p style={{ ...body, fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dark-soft)' }}>{offer.labels.join('. ')}.</p>
            )}
            <p style={body}>{line}</p>
            {error && <p style={{ ...body, color: 'var(--deeprose-deep)' }}>{error}</p>}
            <button onClick={checkNow} disabled={busy} style={primary}>{busy ? 'One moment...' : buttonLabel}</button>
            {isFree && (
              <Link href="/checkout?plan=monthly" onClick={() => logEvent('checkout_started')} style={{ ...body, textAlign: 'center', color: 'var(--primary-deep)', textDecoration: 'underline', fontSize: 13.5 }}>
                Or become a member: 10 checks a month.
              </Link>
            )}
            {needsId && offer.stage === 'before' && (
              <p style={{ ...body, fontSize: 13, color: 'var(--dark-soft)', textAlign: 'center' }}>Takes a few minutes the first time: we confirm your ID once, then never again.</p>
            )}
            {needsId && offer.stage === 'during' && (
              <button onClick={remind} disabled={busy} style={secondary}>Remind me after the date</button>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <button onClick={dismiss} style={quiet}>Not now</button>
              <button onClick={never} style={quiet}>Don&rsquo;t suggest this for him</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
