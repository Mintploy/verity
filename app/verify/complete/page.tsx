'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';
import { Suspense } from 'react';

function VerifyCompleteContent() {
  const [status, setStatus] = useState<'checking' | 'verified' | 'failed' | 'redirecting'>('checking');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('failed');
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/stripe/verify-status/${sessionId}`);
        const data = await res.json();

        if (data.verified) {
          setStatus('verified');
          // Give user a moment to see the success screen, then redirect to checkout
          setTimeout(() => {
            setStatus('redirecting');
            router.push('/checkout');
          }, 2000);
        } else if (data.status === 'requires_input' || data.status === 'canceled') {
          setStatus('failed');
        } else {
          // Still processing — check again in 2s
          setTimeout(checkStatus, 2000);
        }
      } catch {
        setStatus('failed');
      }
    }

    checkStatus();
  }, [sessionId, router]);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ivory)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ marginBottom: 48 }}>
          <Wordmark size={32} color="var(--dark)" />
        </div>

        <div style={{
          background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
          padding: '64px 40px', boxShadow: 'var(--shadow-lg)',
        }}>
          {(status === 'checking' || status === 'redirecting') && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: status === 'redirecting' ? 'var(--sage-pale)' : 'var(--primary-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <Sparkle size={28} color={status === 'redirecting' ? 'var(--sage-deep)' : 'var(--primary)'} />
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, color: 'var(--dark)', margin: 0 }}>
                {status === 'redirecting' ? 'One moment...' : 'Checking your verification...'}
              </p>
            </>
          )}

          {status === 'verified' && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--sage-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M6 14l5 5 11-11" stroke="var(--sage-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 28, color: 'var(--dark)', margin: '0 0 12px' }}>
                Identity verified.
              </p>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: 0, fontWeight: 300 }}>
                Taking you to complete your membership...
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)', margin: '0 0 16px' }}>
                Verification incomplete
              </p>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: '0 0 32px', fontWeight: 300 }}>
                We weren't able to complete your ID verification. Please try again.
              </p>
              <button
                onClick={() => router.push('/verify')}
                style={{
                  padding: '16px 32px', borderRadius: 'var(--r-pill)',
                  background: 'var(--primary)', color: 'var(--ivory)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--serif)', fontSize: 17,
                }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyCompletePage() {
  return (
    <Suspense>
      <VerifyCompleteContent />
    </Suspense>
  );
}
