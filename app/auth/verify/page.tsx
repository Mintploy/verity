'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    if (token) {
      window.location.href = `/api/auth/verify?token=${token}`;
    }
  }, [token]);

  if (error) {
    return (
      <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--plum)', margin: '0 0 12px', fontWeight: 400 }}>
          {error === 'expired' ? 'Link expired.' : 'Link not valid.'}
        </h2>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--plum-soft)', margin: '0 0 32px', fontWeight: 300, lineHeight: 1.6 }}>
          {error === 'expired' ? 'Magic links expire after 15 minutes. Request a new one below.' : 'This link has already been used or is invalid.'}
        </p>
        <Link href="/login" style={{ display: 'inline-block', padding: '14px 28px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 16 }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '64px 40px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, color: 'var(--plum)', margin: 0 }}>
        Signing you in...
      </p>
    </div>
  );
}

export default function AuthVerifyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/"><Wordmark size={32} color="var(--plum)" /></Link>
        </div>
        <Suspense fallback={<div style={{ background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '64px 40px', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}><p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--plum-soft)', margin: 0 }}>Loading...</p></div>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
