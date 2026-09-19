'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPendingPhone } from '@/lib/pending';
import { Wordmark } from '@/components/ui/Wordmark';
import { Bow } from '@/components/ui/Bow';

export default function CheckoutSuccessPage() {
  // She typed his number before she paid. Send her straight back to it rather
  // than to an empty search box she has already filled in once.
  const [pending, setPending] = useState<string | null>(null);
  // After a $19 report: it counts toward a monthly membership for 7 days.
  const [credit, setCredit] = useState<{ until: string } | null>(null);
  useEffect(() => {
    queueMicrotask(() => setPending(getPendingPhone()));
    fetch('/api/auth/me').then(r => r.json()).then(me => {
      if (me?.plan === 'single' && me?.membershipCredit?.until) setCredit(me.membershipCredit);
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ivory)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
        <div style={{ marginBottom: 40 }}>
          <Wordmark size={32} color="var(--dark)" />
        </div>

        <div style={{
          background: 'var(--pearl)', borderRadius: 'var(--r-xl)',
          padding: '64px 48px', boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <Bow size={56} color="var(--rose)" center="var(--ivory)" />
          </div>

          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1.05, fontWeight: 400,
            color: 'var(--dark)', margin: '0 0 16px', letterSpacing: -0.5,
          }}>
            You&rsquo;re in.
          </h1>

          <p style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
            color: 'var(--rose)', margin: '0 0 20px',
          }}>
            Welcome to Verity.
          </p>

          <p style={{
            fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--dark-soft)',
            lineHeight: 1.6, margin: '0 0 40px', fontWeight: 300,
          }}>
            Your plan is active. Your lookups are ready when you are.
            {pending
              ? ' We kept the number you started with, it is ready when you are.'
              : ' Drop in a phone number and get the full picture, quietly, in seconds.'}
          </p>

          <Link href={pending ? `/matches?phone=${pending}` : '/search'} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '18px 36px', borderRadius: 'var(--r-pill)',
            background: 'var(--primary)', color: 'var(--ivory)',
            textDecoration: 'none',
            fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500,
            boxShadow: 'var(--shadow-pop)',
          }}>
            {pending ? 'See who he is →' : 'Run your first search →'}
          </Link>

          <div style={{ marginTop: 20, fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
            A receipt was sent to your email · Membership renews in 12 months
          </div>
        </div>

        {credit && (
          <div style={{ marginTop: 20, background: 'var(--pearl)', borderRadius: 'var(--r-xl)', padding: '28px 32px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)', lineHeight: 1.15 }}>Your $19 counts toward a membership for the next 7 days.</div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', margin: '8px 0 18px', fontWeight: 300, lineHeight: 1.6 }}>
              Become a member by {new Date(credit.until).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} and the first month is $20.
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/checkout?plan=monthly" style={{ padding: '12px 24px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>Become a member</Link>
              <button onClick={() => setCredit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', textDecoration: 'underline' }}>Not now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
