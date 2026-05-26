'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';

type Step = 'intro' | 'loading' | 'error';

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('intro');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const startVerification = async () => {
    setStep('loading');
    try {
      const res = await fetch('/api/stripe/identity', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start verification');
      // Redirect to Stripe Identity hosted verification page
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ivory)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Wordmark size={32} color="var(--plum)" />
        </div>

        {step === 'intro' && (
          <div style={{
            background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
            padding: '48px 40px', boxShadow: 'var(--shadow-lg)',
          }}>
            <span className="v-sticker" style={{ marginBottom: 24, display: 'inline-flex' }}>
              <Sparkle size={10} color="var(--wine)" /> for her, only
            </span>

            <h1 style={{
              fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1.05, fontWeight: 400,
              color: 'var(--plum)', margin: '0 0 20px', letterSpacing: -0.5,
            }}>
              One quick<br />
              <em style={{ color: 'var(--rose)', fontWeight: 300 }}>verification.</em>
            </h1>

            <p style={{
              fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--plum-soft)',
              lineHeight: 1.6, margin: '0 0 32px', fontWeight: 300,
            }}>
              Verity is exclusively for women. A 90-second ID check — powered by Stripe Identity —
              keeps the room safe. Your ID is never stored. This is a one-time gate.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {[
                'Government-issued ID scanned securely by Stripe',
                'Quick selfie to confirm you\'re present',
                'Your data is never stored or sold',
                'One-time verification — never again',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--sage-pale)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="var(--sage-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--plum)', fontWeight: 300 }}>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={startVerification}
              style={{
                width: '100%', padding: '18px 28px',
                borderRadius: 'var(--r-pill)',
                background: 'var(--primary)', color: 'var(--ivory)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500,
                boxShadow: 'var(--shadow-pop)',
              }}
            >
              Begin <em style={{ fontWeight: 300 }}>verification</em> →
            </button>

            <div style={{
              marginTop: 20, textAlign: 'center',
              fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)',
              lineHeight: 1.6, letterSpacing: 0.2,
            }}>
              Powered by Stripe Identity · End-to-end encrypted<br />
              After verification, you'll choose your membership ($99/year)
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div style={{
            background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
            padding: '64px 40px', boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--primary-pale)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              <Sparkle size={24} color="var(--primary)" />
            </div>
            <p style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
              color: 'var(--plum)', margin: 0,
            }}>Opening Stripe Identity...</p>
            <p style={{
              fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--plum-soft)',
              margin: '12px 0 0', fontWeight: 300,
            }}>You'll be redirected in a moment.</p>
          </div>
        )}

        {step === 'error' && (
          <div style={{
            background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
            padding: '48px 40px', boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--plum)', margin: 0 }}>
              Something went wrong
            </p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--deeprose-deep)', margin: '12px 0 32px' }}>
              {error}
            </p>
            <button
              onClick={() => setStep('intro')}
              style={{
                padding: '14px 28px', borderRadius: 'var(--r-pill)',
                background: 'var(--primary)', color: 'var(--ivory)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--serif)', fontSize: 17,
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
