'use client';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';

interface NavProps {
  onSearch?: () => void;
  showCompare?: boolean;
  onCompare?: () => void;
}

export function Nav({ onSearch, showCompare, onCompare }: NavProps) {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '20px 56px',
      background: 'rgba(255, 244, 244, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid var(--ivory-deep)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Link href="/">
          <Wordmark size={26} color="var(--plum)" />
        </Link>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {['How it works', 'Stories', 'Trust & safety', 'Help'].map((label) => (
            <Link key={label} href="#" style={{
              fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--plum-soft)',
              textDecoration: 'none', letterSpacing: 0.2, whiteSpace: 'nowrap',
            }}>
              {label}
            </Link>
          ))}
          {showCompare && (
            <button onClick={onCompare} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 'var(--r-pill)',
              background: 'var(--blush-pale)', color: 'var(--wine)',
              border: 0, cursor: 'pointer',
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              <Sparkle size={9} color="var(--wine)" />
              Compare
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/verify" style={{ fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--plum-soft)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Sign in
        </Link>
        <Link href="/verify" style={{
          padding: '10px 22px', borderRadius: 'var(--r-pill)',
          background: 'var(--primary)', color: 'var(--ivory)',
          textDecoration: 'none',
          fontFamily: 'var(--serif)', fontSize: 15, letterSpacing: 0.3,
          fontWeight: 500, whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-pop)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          Begin <em style={{ fontWeight: 300 }}>verification</em>
        </Link>
      </div>
    </nav>
  );
}
