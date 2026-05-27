'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { Sparkle } from '@/components/ui/Sparkle';

interface NavProps {
  showCompare?: boolean;
  onCompare?: () => void;
}

export function Nav({ showCompare, onCompare }: NavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCompare = () => {
    setMenuOpen(false);
    onCompare ? onCompare() : router.push('/compare');
  };

  const close = () => setMenuOpen(false);

  const navLinks = [
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Stories', href: '/stories' },
    { label: 'Help', href: '/help' },
  ];

  return (
    <>
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
            {navLinks.map(({ label, href }) => (
              <Link key={label} href={href} style={{
                fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)',
                textDecoration: 'none', letterSpacing: 0.2,
              }}>{label}</Link>
            ))}
            {showCompare && (
              <button onClick={handleCompare} style={{
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
          <Link href="/login" className="v-hide-mobile" style={{
            fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)',
            textDecoration: 'none',
          }}>
            Sign in
          </Link>
          <Link href="/verify" className="v-hide-mobile" style={{
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

          {/* Hamburger — mobile only */}
          <button
            className="v-mobile-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px', display: 'flex', flexDirection: 'column',
              gap: 5, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--dark)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--dark)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 16, height: 2, background: 'var(--dark)', borderRadius: 2 }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`v-mobile-overlay${menuOpen ? ' open' : ''}`} onClick={close} />

      {/* Mobile menu panel */}
      <div className={`v-mobile-panel${menuOpen ? ' open' : ''}`}>
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--gold-pale)',
        }}>
          <Link href="/" onClick={close}><Wordmark size={24} color="var(--dark)" /></Link>
          <button onClick={close} aria-label="Close menu" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 8, color: 'var(--dark-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '8px 0' }}>
          {navLinks.map(({ label, href }) => (
            <Link key={label} href={href} onClick={close} style={{
              display: 'block', padding: '16px 24px',
              fontFamily: 'var(--sans)', fontSize: 17, color: 'var(--dark)',
              textDecoration: 'none', borderBottom: '1px solid var(--ivory-deep)',
              letterSpacing: 0.1,
            }}>
              {label}
            </Link>
          ))}

          {showCompare && (
            <button onClick={handleCompare} style={{
              display: 'flex', width: '100%', alignItems: 'center', gap: 10,
              padding: '16px 24px', background: 'none', border: 'none',
              borderBottom: '1px solid var(--ivory-deep)',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 'var(--r-pill)',
                background: 'var(--gold-pale)', color: 'var(--gold-deep)',
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 500,
              }}>
                <Sparkle size={9} color="var(--gold-deep)" />
                Compare
              </span>
            </button>
          )}
        </div>

        {/* CTA buttons */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/verify" onClick={close} style={{
            display: 'block', padding: '16px 24px', textAlign: 'center',
            borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)',
            textDecoration: 'none', fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500,
            boxShadow: 'var(--shadow-pop)',
          }}>
            Get started
          </Link>
          <Link href="/login" onClick={close} style={{
            display: 'block', padding: '14px 24px', textAlign: 'center',
            borderRadius: 'var(--r-pill)', border: '1.5px solid var(--ivory-deep)',
            color: 'var(--dark-soft)', textDecoration: 'none',
            fontFamily: 'var(--sans)', fontSize: 15,
          }}>
            Sign in
          </Link>
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--gold-pale)',
          fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)',
          letterSpacing: 0.3, textAlign: 'center',
        }}>
          VERIFIED WOMEN ONLY · VERITYPRIVE.COM
        </div>
      </div>
    </>
  );
}
