'use client';
import { useState, useEffect } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';
import type { Plan } from '@/lib/stripe';

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
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'var(--sage-pale)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        {CHECK_SVG}
      </div>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark)', fontWeight: 300 }}>{text}</span>
    </div>
  );
}

const ANNUAL_FEATURES = [
  'Up to 15 background reports per month',
  'Phone intelligence on any number',
  'Compare multiple men side by side',
  'He will never know you searched',
];

const FOUNDING_FEATURES = [
  'Reserved for the first 100 women',
  'Lock in $199/year for life',
  'Up to 15 background reports per month',
  'Phone intelligence on any number',
  'Compare multiple men side by side',
  'He will never know you searched',
];

const SINGLE_FEATURES = [
  'One complete background report',
  'Phone intelligence included',
  'No subscription required',
  'He will never know you searched',
];

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  sub: string;
  features: string[];
  badge?: string;
  disabled?: boolean;
  accent?: string;
}

function PlanCard({ plan, selected, onSelect, title, price, sub, features, badge, disabled, accent = 'var(--primary-mist)' }: PlanCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        width: '100%', textAlign: 'left', border: 'none', padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer', background: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        padding: '22px 20px',
        background: selected ? accent : 'var(--ivory-warm)',
        borderRadius: 'var(--r-lg)',
        border: selected ? '2px solid var(--primary)' : '2px solid transparent',
        outline: selected ? '0' : '1px solid var(--gold-pale)',
        outlineOffset: -1,
        transition: 'all .15s',
        position: 'relative',
      }}>
        {badge && (
          <div style={{
            position: 'absolute', top: -10, right: 16,
            background: 'var(--primary)', color: 'var(--ivory)',
            fontFamily: 'var(--sans)', fontSize: 10, fontWeight: 600,
            padding: '3px 10px', borderRadius: 'var(--r-pill)', letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}>{badge}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)' }}>{title}</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)', fontWeight: 400 }}>{price}</span>
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', marginBottom: 14 }}>{sub}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {features.map((f, i) => <CheckItem key={i} text={f} />)}
        </div>
      </div>
    </button>
  );
}

export default function CheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [foundingAvailable, setFoundingAvailable] = useState(false);
  const [slotsLeft, setSlotsLeft] = useState(0);

  useEffect(() => {
    const email = getEmailFromCookie();
    if (!email) {
      window.location.replace('/verify');
      return;
    }

    fetch('/api/stripe/checkout')
      .then(r => r.json())
      .then(d => {
        setFoundingAvailable(d.foundingAvailable ?? false);
        setSlotsLeft(d.slotsLeft ?? 0);
        if (d.foundingAvailable) setSelectedPlan('founding');
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    const email = getEmailFromCookie();
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
          setSelectedPlan('annual');
          throw new Error('Founding slots just filled up — we\'ve switched you to the Annual plan.');
        }
        throw new Error(data.error ?? 'Failed to create checkout');
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const priceLabel = selectedPlan === 'founding' ? '$199/year' : selectedPlan === 'annual' ? '$297/year' : '$19 one-time';

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ivory)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Wordmark size={32} color="var(--dark)" />
        </div>

        <div style={{
          background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
          padding: '48px 40px', boxShadow: 'var(--shadow-lg)',
        }}>
          <span className="v-sticker" style={{ marginBottom: 24, display: 'inline-flex' }}>
            <Sparkle size={10} color="var(--wine)" /> you're verified
          </span>

          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1.05, fontWeight: 400,
            color: 'var(--dark)', margin: '0 0 8px', letterSpacing: -0.5,
          }}>
            Choose your plan
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--mauve-deep)', marginBottom: 32, lineHeight: 1.5 }}>
            All plans include full background reports. He'll never know you searched.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {foundingAvailable && (
              <PlanCard
                plan="founding"
                selected={selectedPlan === 'founding'}
                onSelect={() => setSelectedPlan('founding')}
                title="Founding Member"
                price="$199"
                sub={`/year · ${slotsLeft} of 100 spots left · locked for life`}
                features={FOUNDING_FEATURES}
                badge="Best value"
                accent="var(--primary-mist)"
              />
            )}
            <PlanCard
              plan="annual"
              selected={selectedPlan === 'annual'}
              onSelect={() => setSelectedPlan('annual')}
              title="Annual"
              price="$297"
              sub="/year · renews annually"
              features={ANNUAL_FEATURES}
              accent="var(--blush-pale)"
            />
            <PlanCard
              plan="single"
              selected={selectedPlan === 'single'}
              onSelect={() => setSelectedPlan('single')}
              title="Single Report"
              price="$19"
              sub="one-time · no subscription"
              features={SINGLE_FEATURES}
              accent="var(--sage-pale)"
            />
          </div>

          {error && (
            <div style={{
              padding: '14px 16px', background: 'var(--deeprose-pale)',
              borderRadius: 'var(--r-md)', marginBottom: 20,
              fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--deeprose-deep)',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={startCheckout}
            disabled={loading}
            style={{
              width: '100%', padding: '18px 28px',
              borderRadius: 'var(--r-pill)',
              background: loading ? 'var(--mauve)' : 'var(--primary)',
              color: 'var(--ivory)',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500,
              boxShadow: loading ? 'none' : 'var(--shadow-pop)',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Opening Stripe...' : `Continue with ${priceLabel} →`}
          </button>

          <div style={{
            marginTop: 20, textAlign: 'center',
            fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)',
            lineHeight: 1.6, letterSpacing: 0.2,
          }}>
            Secured by Stripe · Cancel anytime · Reports capped at 15/month
          </div>
        </div>
      </div>
    </div>
  );
}
