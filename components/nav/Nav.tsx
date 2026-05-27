'use client';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';

interface NavProps {
  showCompare?: boolean;
  onCompare?: () => void;
}

export function Nav({ showCompare, onCompare }: NavProps) {
  return (
    <nav className="v-nav" style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,244,244,0.9)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid var(--gold-pale)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Link href="/"><Wordmark size={26} color="var(--dark)" /></Link>
        <div className="v-nav-links">
          {[
            { label: 'How it works', href: '/#how-it-works' },
            { label: 'Stories', href: '/stories' },
            { label: 'Help', href: '/help' },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)',
              textDecoration: 'none', letterSpacing: 0.2,
            }}>{label}</Link>
          ))}
          {showCompare && (
            <button onClick={onCompare} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 'var(--r-pill)',
              background: 'var(--gold-pale)', color: 'var(--gold-deep)',
              border: 0, cursor: 'pointer',
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 500,
            }}>
              <Sparkle size={9} color="var(--gold-deep)" />
              Compare
            </button>
          )}
        </div>
      </div>
      <div className="v-nav-actions">
        <Link href="/login" style={{
          fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)',
          textDecoration: 'none',
        }} className="v-hide-mobile">
          Sign in
        </Link>
        <Link href="/verify" style={{
          padding: '10px 20px', borderRadius: 'var(--r-pill)',
          background: 'var(--primary)', color: 'var(--ivory)',
          textDecoration: 'none',
          fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: 0.3,
          fontWeight: 500, whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-pop)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          Get started
        </Link>
      </div>
    </nav>
  );
}
