import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Floret } from '@/components/ui/Floret';

export default function CheckoutSuccessPage() {
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
            <Floret size={56} color="var(--rose)" center="var(--ivory)" />
          </div>

          <h1 style={{
            fontFamily: 'var(--serif)', fontSize: 48, lineHeight: 1.05, fontWeight: 400,
            color: 'var(--dark)', margin: '0 0 16px', letterSpacing: -0.5,
          }}>
            You're in.
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
            Your membership is active. You can now run unlimited reports.
            Drop in a phone number and get the full picture — quietly, in seconds.
          </p>

          <Link href="/search" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '18px 36px', borderRadius: 'var(--r-pill)',
            background: 'var(--primary)', color: 'var(--ivory)',
            textDecoration: 'none',
            fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500,
            boxShadow: 'var(--shadow-pop)',
          }}>
            Run your first search →
          </Link>

          <div style={{ marginTop: 20, fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
            A receipt was sent to your email · Membership renews in 12 months
          </div>
        </div>
      </div>
    </div>
  );
}
