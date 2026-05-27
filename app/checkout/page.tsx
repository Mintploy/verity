'use client';
import { useState, useEffect } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';

function getEmailFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/verity-pending-email=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    const email = getEmailFromCookie();
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create checkout');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ivory)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Wordmark size={32} color="var(--plum)" />
        </div>

        <div style={{
          background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
          padding: '48px 40px', boxShadow: 'var(--shadow-lg)',
        }}>
          <span className="v-sticker" style={{ marginBottom: 24, display: 'inline-flex' }}>
            <Sparkle size={10} color="var(--wine)" /> you're verified
          </span>

          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1.05, fontWeight: 400,
            color: 'var(--plum)', margin: '0 0 20px', letterSpacing: -0.5,
          }}>
            One year of<br />
            <em style={{ color: 'var(--rose)', fontWeight: 300 }}>clarity.</em>
          </h1>

          <div style={{
            padding: '28px 24px', background: 'var(--primary-mist)',
            borderRadius: 'var(--r-lg)', marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--plum)' }}>
                Verity Annual Membership
              </span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--plum)', fontWeight: 400 }}>
                $99
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Unlimited background reports for 12 months',
                'Phone intelligence on any number',
                'Compare multiple men side by side',
                'PDF export and 30-day re-run reminders',
                'He will never know you searched',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'var(--sage-pale)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                  }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="var(--sage-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--plum)', fontWeight: 300 }}>{item}</span>
                </div>
              ))}
            </div>
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
            {loading ? 'Opening Stripe...' : 'Begin membership → $99/year'}
          </button>

          <div style={{
            marginTop: 20, textAlign: 'center',
            fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)',
            lineHeight: 1.6, letterSpacing: 0.2,
          }}>
            Secured by Stripe · Cancel anytime · Annual renewal is your choice
          </div>
        </div>
      </div>
    </div>
  );
}
