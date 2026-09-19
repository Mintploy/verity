'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';

type Step = 'form' | 'sending' | 'sent' | 'error';

/**
 * A free account is an email address. The journal is hers the moment she
 * clicks the link; lookups come with a plan, later, if she wants them.
 */
export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    if (!valid) return;
    setStep('sending');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStep(res.ok ? 'sent' : 'error');
    } catch {
      setStep('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/"><Wordmark size={32} color="var(--dark)" /></Link>
        </div>

        {(step === 'form' || step === 'sending' || step === 'error') && (
          <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)' }}>
            <span className="v-sticker" style={{ marginBottom: 24, display: 'inline-flex' }}>
              <Sparkle size={10} color="var(--wine)" /> free to start
            </span>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 44, lineHeight: 1.05, fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px', letterSpacing: -0.5 }}>
              Your journal,<br />
              <em style={{ color: 'var(--rose)', fontWeight: 300 }}>just for you.</em>
            </h1>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', lineHeight: 1.6, margin: '0 0 32px', fontWeight: 300 }}>
              Keep a private file on every man you meet, log how each date felt, and see the patterns. Free, with just your email. Add lookups whenever you want them.
            </p>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="you@example.com" autoFocus
              autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" autoComplete="email"
              style={{ width: '100%', padding: '15px 18px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--ivory-deep)', background: 'var(--ivory)', fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--dark)', marginBottom: 14, outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={submit} disabled={step === 'sending' || !valid}
              style={{ width: '100%', padding: 16, borderRadius: 'var(--r-pill)', background: valid ? 'var(--primary)' : 'var(--mauve)', color: 'var(--ivory)', border: 'none', cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, boxShadow: valid ? 'var(--shadow-pop)' : 'none' }}
            >
              {step === 'sending' ? 'Sending...' : 'Send me a link →'}
            </button>
            {step === 'error' && (
              <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--deeprose-deep)', margin: '14px 0 0', textAlign: 'center' }}>
                Something went wrong. Please try again.
              </p>
            )}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--rose)', textDecoration: 'underline' }}>Sign in</Link>
              </span>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 400, color: 'var(--dark)', margin: '0 0 12px' }}>Check your inbox.</h2>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', lineHeight: 1.6, fontWeight: 300, margin: 0 }}>
              We sent a link to <strong style={{ color: 'var(--dark)' }}>{email.trim().toLowerCase()}</strong>.<br />It expires in 15 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
