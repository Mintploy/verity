'use client';
import Link from 'next/link';

export function FinalCTA() {
  return (
    <section style={{ padding: '20px 56px 80px' }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '80px 64px',
        borderRadius: 'var(--r-xl)',
        background: 'linear-gradient(160deg, var(--primary-deep) 0%, var(--plum) 100%)',
        color: 'var(--ivory)', position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--rose) 0%, transparent 60%)', opacity: 0.5,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -120, left: -120, width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--blush) 0%, transparent 60%)', opacity: 0.4,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="v-eyebrow" style={{ color: 'var(--blush)' }}>Begin</span>
          <h2 style={{
            fontFamily: 'var(--serif)', fontSize: 76, lineHeight: 1, fontWeight: 400,
            margin: '20px auto 0', color: 'var(--ivory)', maxWidth: 800, letterSpacing: -0.7,
          }}>
            Date <em style={{ color: 'var(--blush)' }}>deliberately.</em><br />
            Always on your terms.
          </h2>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 17, opacity: 0.85, lineHeight: 1.6,
            margin: '24px auto 0', maxWidth: 540, fontWeight: 300,
          }}>
            One verified account, unlimited reports for one year. $99 — the price of one nice dinner.
            Membership renews only if you choose.
          </p>
          <Link href="/verify" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginTop: 40, padding: '20px 36px', borderRadius: 'var(--r-pill)',
            background: 'var(--blush)', color: 'var(--plum)', textDecoration: 'none',
            fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 500, letterSpacing: 0.2,
            boxShadow: '0 16px 40px rgba(245,215,210,0.3)',
          }}>
            Begin <em style={{ fontWeight: 300 }}>verification</em> →
          </Link>
        </div>
      </div>
    </section>
  );
}
