'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';
import { Suspense } from 'react';
import Link from 'next/link';

function VerifyCompleteContent() {
  const [status, setStatus] = useState<'checking' | 'verified' | 'failed' | 'slow'>('checking');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus('failed');
      return;
    }

    async function checkStatus() {
      attempts.current += 1;

      // After 12 attempts (~24s), show manual continue option
      if (attempts.current > 12) {
        setStatus('slow');
        return;
      }

      try {
        const res = await fetch(`/api/stripe/verify-status/${sessionId}`);
        const data = await res.json();

        if (data.verified) {
          setStatus('verified');
          router.push('/checkout');
        } else if (data.status === 'requires_input' || data.status === 'canceled') {
          setStatus('failed');
        } else {
          setTimeout(checkStatus, 2000);
        }
      } catch {
        if (attempts.current > 3) {
          setStatus('slow');
        } else {
          setTimeout(checkStatus, 2000);
        }
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
          {status === 'checking' && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--primary-pale)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <Sparkle size={28} color="var(--primary)" />
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, color: 'var(--dark)', margin: 0 }}>
                Checking your verification...
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
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: '0 0 32px', fontWeight: 300 }}>
                Taking you to your membership...
              </p>
              <Link href="/checkout" style={{
                display: 'inline-block', padding: '16px 32px', borderRadius: 'var(--r-pill)',
                background: 'var(--primary)', color: 'var(--ivory)',
                textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 17,
                boxShadow: 'var(--shadow-pop)',
              }}>
                Continue to membership →
              </Link>
            </>
          )}

          {status === 'slow' && (
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
              <p style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)', margin: '0 0 12px' }}>
                Verification received.
              </p>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: '0 0 32px', fontWeight: 300 }}>
                Stripe is still processing your ID. You can continue to membership now — it may take a moment to confirm.
              </p>
              <Link href="/checkout" style={{
                display: 'inline-block', padding: '16px 32px', borderRadius: 'var(--r-pill)',
                background: 'var(--primary)', color: 'var(--ivory)',
                textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 17,
                boxShadow: 'var(--shadow-pop)',
              }}>
                Continue to membership →
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--dark)', margin: '0 0 16px' }}>
                Verification incomplete
              </p>
              <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: '0 0 32px', fontWeight: 300 }}>
                We weren't able to complete your ID verification. Please try again — make sure your ID is clearly visible and your selfie is well-lit.
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
