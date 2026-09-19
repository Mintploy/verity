'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';
import type { PaidPlan } from '@/lib/stripe';

/**
 * Pricing. The journal is free for everyone and says so first; lookups are
 * what a plan buys. Monthly is the default. Founding shows how many of the
 * 100 places remain and disappears when they are gone.
 */

function getEmailFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/verity-pending-email=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

const CHECK_SVG = (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1.5 4.5l2 2 4-4" stroke="var(--sage-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function CheckItem({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--sage-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        {CHECK_SVG}
      </div>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)', fontWeight: 300 }}>{text}</span>
    </div>
  );
}

const LOOKUP_FEATURES = [
  'Full background report on any man',
  'Phone intelligence on any number',
  'Compare men side by side',
  'Every search stays confidential',
];

const PLAN_COPY: Record<PaidPlan, { title: string; price: string; per: string; sub: string; features: string[]; accent: string; badge?: string }> = {
  monthly: {
    title: 'Monthly', price: '$39', per: '/month',
    sub: '10 lookups a month · cancel any time',
    features: ['10 lookups every month', ...LOOKUP_FEATURES],
    accent: 'var(--primary-mist)', badge: 'Most popular',
  },
  annual: {
    title: 'Annual', price: '$349', per: '/year',
    sub: '10 lookups a month · two months free',
    features: ['10 lookups every month, all year', ...LOOKUP_FEATURES],
    accent: 'var(--blush-pale)',
  },
  founding: {
    title: 'Founding', price: '$199', per: '/year',
    sub: '', // filled in with places remaining
    features: ['10 lookups every month', 'Your price never goes up while you stay', 'One of the first 100 women on Verity', ...LOOKUP_FEATURES],
    accent: 'var(--honey-pale, var(--blush-pale))', badge: 'First 100 only',
  },
  single: {
    title: 'Single lookup', price: '$19', per: ' once',
    sub: '1 lookup · never expires · no subscription',
    features: ['One complete background report', 'Use it whenever you want', 'Every search stays confidential'],
    accent: 'var(--sage-pale)',
  },
};

function PlanCard({ plan, selected, onSelect, sub, current }: { plan: PaidPlan; selected: boolean; onSelect: () => void; sub?: string; current?: boolean }) {
  const c = PLAN_COPY[plan];
  return (
    <button onClick={onSelect} style={{ width: '100%', textAlign: 'left', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}>
      <div style={{
        padding: '22px 20px', background: selected ? c.accent : 'var(--ivory-warm)', borderRadius: 'var(--r-lg)',
        border: selected ? '2px solid var(--primary)' : '2px solid transparent',
        outline: selected ? '0' : '1px solid var(--gold-pale)', outlineOffset: -1, transition: 'all .15s', position: 'relative',
      }}>
        {(current || c.badge) && (
          <div style={{ position: 'absolute', top: -10, right: 16, background: current ? 'var(--sage-deep)' : 'var(--primary)', color: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--r-pill)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {current ? 'Your plan' : c.badge}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)' }}>{c.title}</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)' }}>
            {c.price}<span style={{ fontSize: 13, color: 'var(--mauve-deep)' }}>{c.per}</span>
          </span>
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', marginBottom: 14 }}>{sub ?? c.sub}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.features.map((f, i) => <CheckItem key={i} text={f} />)}
        </div>
      </div>
    </button>
  );
}

export default function CheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [foundingAvailable, setFoundingAvailable] = useState(false);
  const [slotsLeft, setSlotsLeft] = useState(0);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [signedIn, setSignedIn] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    // Signed in: she pays as herself. Not signed in: the pre-account funnel
    // may have left her email in a cookie. Neither: pricing still shows; the
    // button sends her to a free account first.
    fetch('/api/auth/me').then(r => r.json()).then(me => {
      if (me?.authenticated && me.email) { setEmail(me.email); setSignedIn(true); setCurrentPlan(me.plan ?? null); return; }
      setEmail(getEmailFromCookie());
    }).catch(() => setEmail(getEmailFromCookie()));

    fetch('/api/stripe/checkout')
      .then(r => r.json())
      .then(d => {
        setFoundingAvailable(d.foundingAvailable ?? false);
        setSlotsLeft(d.slotsLeft ?? 0);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  const startCheckout = async () => {
    if (!email) { window.location.href = '/signup'; return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: selectedPlan, returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'founding_full') {
          setFoundingAvailable(false);
          setSlotsLeft(0);
          setSelectedPlan('monthly');
          throw new Error('The last founding place was just taken. Monthly is selected instead.');
        }
        throw new Error(data.error ?? 'Could not start checkout');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout');
      setLoading(false);
    }
  };

  const c = PLAN_COPY[selectedPlan];
  const cta = email ? `Continue with ${c.title}, ${c.price}${c.per.trim()} →` : 'Create a free account first →';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/"><Wordmark size={32} color="var(--dark)" /></Link>
        </div>

        <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '44px 40px', boxShadow: 'var(--shadow-lg)' }}>
          <span className="v-sticker" style={{ marginBottom: 20, display: 'inline-flex' }}>
            <Sparkle size={10} color="var(--wine)" /> {signedIn ? 'signed in' : 'free to start'}
          </span>

          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1.05, fontWeight: 400, color: 'var(--dark)', margin: '0 0 10px', letterSpacing: -0.5 }}>
            Your journal is free.<br />
            <em style={{ color: 'var(--rose)', fontWeight: 300 }}>Lookups when you want them.</em>
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', margin: '0 0 24px', lineHeight: 1.6, fontWeight: 300 }}>
            Every woman gets His Files, dates, flags and patterns for nothing, with no card. A plan adds lookups: the full picture on any man, in seconds.
          </p>

          {/* Free, always. Not a card she can select; it is what she already has. */}
          <div style={{ padding: '16px 20px', borderRadius: 'var(--r-lg)', background: 'var(--ivory)', border: '1px solid var(--gold-pale)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)' }}>Free</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', marginTop: 2 }}>Unlimited people and dates · no lookups</div>
            </div>
            {signedIn && !currentPlan
              ? <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, color: 'var(--sage-deep)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your plan</span>
              : !signedIn
                ? <Link href="/signup" style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--primary-deep)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Start free</Link>
                : <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)' }}>$0</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <PlanCard plan="monthly" selected={selectedPlan === 'monthly'} onSelect={() => setSelectedPlan('monthly')} current={currentPlan === 'monthly'} />
            <PlanCard plan="annual" selected={selectedPlan === 'annual'} onSelect={() => setSelectedPlan('annual')} current={currentPlan === 'annual'} />
            {(foundingAvailable || currentPlan === 'founding') && (
              <PlanCard
                plan="founding"
                selected={selectedPlan === 'founding'}
                onSelect={() => setSelectedPlan('founding')}
                sub={`10 lookups a month · ${slotsLeft} of 100 places left · price locked while you stay`}
                current={currentPlan === 'founding'}
              />
            )}
            <PlanCard plan="single" selected={selectedPlan === 'single'} onSelect={() => setSelectedPlan('single')} current={currentPlan === 'single'} />
          </div>

          {error && (
            <div style={{ padding: '14px 16px', background: 'var(--deeprose-pale)', borderRadius: 'var(--r-md)', marginBottom: 20, fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--deeprose-deep)' }}>
              {error}
            </div>
          )}

          <button
            onClick={startCheckout}
            disabled={loading}
            style={{ width: '100%', padding: '18px 28px', borderRadius: 'var(--r-pill)', background: loading ? 'var(--mauve)' : 'var(--primary)', color: 'var(--ivory)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500, boxShadow: loading ? 'none' : 'var(--shadow-pop)' }}
          >
            {loading ? 'Opening Stripe...' : cta}
          </button>

          <div style={{ marginTop: 18, textAlign: 'center', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', lineHeight: 1.6 }}>
            Memberships renew automatically until you cancel. Lookups do not roll over. Payments by Stripe; we never see your card.
          </div>
        </div>
      </div>
    </div>
  );
}
