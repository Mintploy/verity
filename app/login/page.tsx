'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';

type Step = 'form' | 'sending' | 'sent' | 'error';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.includes('@')) return;
    setStep('sending');

    const res = await fetch('/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStep('error');
    } else {
      setStep('sent');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/"><Wordmark size={32} color="var(--dark)" /></Link>
        </div>

        <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)' }}>
          {(step === 'form' || step === 'sending') && (
            <>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px', letterSpacing: -0.4, lineHeight: 1.05 }}>
                Welcome back.
              </h1>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: '0 0 32px', fontWeight: 300, lineHeight: 1.6 }}>
                We'll send a sign-in link to your email. No password needed.
              </p>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="your@email.com" autoFocus
                style={{
                  width: '100%', padding: '15px 18px', borderRadius: 'var(--r-pill)',
                  border: '1.5px solid var(--ivory-deep)', background: 'var(--ivory)',
                  fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--dark)',
                  marginBottom: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={step === 'sending' || !email.includes('@')}
                style={{
                  width: '100%', padding: '16px', borderRadius: 'var(--r-pill)',
                  background: email.includes('@') ? 'var(--primary)' : 'var(--mauve)',
                  color: 'var(--ivory)', border: 'none',
                  cursor: email.includes('@') ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
                  boxShadow: email.includes('@') ? 'var(--shadow-pop)' : 'none',
                }}
              >
                {step === 'sending' ? 'Sending...' : 'Send sign-in link →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)' }}>
                  New here?{' '}
                  <Link href="/verify" style={{ color: 'var(--rose)', textDecoration: 'underline' }}>Start verification</Link>
                </span>
              </div>
            </>
          )}

          {step === 'sent' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sage-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M4 14l6 6L24 8" stroke="var(--sage-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px' }}>Check your inbox.</h2>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', lineHeight: 1.6, fontWeight: 300, margin: 0 }}>
                We sent a sign-in link to <strong style={{ color: 'var(--dark)' }}>{email}</strong>.<br />Expires in 15 minutes.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--dark)', margin: '0 0 12px' }}>
                {error?.includes('No account') ? 'No account found.' : error?.includes('membership') ? 'No active membership.' : 'Something went wrong.'}
              </h2>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', margin: '0 0 28px', fontWeight: 300, lineHeight: 1.6 }}>{error}</p>
              {error?.includes('membership') || error?.includes('No account') ? (
                <Link href="/verify" style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 16 }}>
                  Sign up →
                </Link>
              ) : (
                <button onClick={() => { setStep('form'); setError(null); }} style={{ padding: '14px 28px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', border: 'none', cursor: 'pointer', fontFamily: 'var(--serif)', fontSize: 16 }}>
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
