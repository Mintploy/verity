'use client';
import { useState } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';
import Link from 'next/link';

type Step = 'email' | 'starting' | 'error';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [error, setError] = useState<string | null>(null);

  const startVerification = async () => {
    if (!email.includes('@')) return;
    setStep('starting');

    document.cookie = `verity-pending-email=${encodeURIComponent(email)}; path=/; max-age=3600; samesite=lax`;

    try {
      const res = await fetch('/api/stripe/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start verification');
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setStep('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/"><Wordmark size={32} color="var(--plum)" /></Link>
        </div>

        {step === 'email' && (
          <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)' }}>
            <span className="v-sticker" style={{ marginBottom: 24, display: 'inline-flex' }}>
              <Sparkle size={10} color="var(--wine)" /> for her, only
            </span>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1.05, fontWeight: 400, color: 'var(--plum)', margin: '0 0 12px', letterSpacing: -0.5 }}>
              Let's get you<br />
              <em style={{ color: 'var(--rose)', fontWeight: 300 }}>verified.</em>
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--plum-soft)', lineHeight: 1.6, margin: '0 0 32px', fontWeight: 300 }}>
              Enter your email, then complete a quick ID check. Takes 90 seconds. You only do this once.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>Your email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startVerification()}
                placeholder="you@example.com" autoFocus
                style={{
                  width: '100%', padding: '15px 18px', borderRadius: 'var(--r-pill)',
                  border: '1.5px solid var(--ivory-deep)', background: 'var(--ivory)',
                  fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--plum)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={startVerification} disabled={!email.includes('@')}
              style={{
                width: '100%', padding: '17px 28px', borderRadius: 'var(--r-pill)',
                background: email.includes('@') ? 'var(--primary)' : 'var(--mauve)',
                color: 'var(--ivory)', border: 'none',
                cursor: email.includes('@') ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
                boxShadow: email.includes('@') ? 'var(--shadow-pop)' : 'none',
              }}
            >
              Continue to ID verification →
            </button>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {["Government ID scanned by Stripe — never stored by us", "Quick selfie to confirm you're present", "One-time check — never repeated"].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--sage-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="var(--sage-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--plum)', fontWeight: 300 }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--ivory-deep)', textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--plum-soft)' }}>
                Already a member?{' '}
                <Link href="/login" style={{ color: 'var(--rose)', textDecoration: 'underline' }}>Sign in</Link>
              </span>
            </div>
          </div>
        )}

        {step === 'starting' && (
          <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '64px 40px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Sparkle size={24} color="var(--primary)" />
            </div>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--plum)', margin: 0 }}>Opening Stripe Identity...</p>
          </div>
        )}

        {step === 'error' && (
          <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--plum)', margin: '0 0 12px' }}>Something went wrong</p>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--deeprose-deep)', margin: '0 0 32px' }}>{error}</p>
            <button onClick={() => setStep('email')} style={{ padding: '14px 28px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', border: 'none', cursor: 'pointer', fontFamily: 'var(--serif)', fontSize: 17 }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
