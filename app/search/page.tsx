'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import { Sparkle } from '@/components/ui/Sparkle';

function SearchContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');

      // Store report in sessionStorage and navigate to report page
      sessionStorage.setItem(`report-${data.report.searchId}`, JSON.stringify(data.report));
      router.push(`/report/${data.report.searchId}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 24, padding: '80px 24px',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--primary-pale)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'spin 2s linear infinite',
        }}>
          <Sparkle size={36} color="var(--primary)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 28, color: 'var(--dark)', margin: 0 }}>
            Pulling the file...
          </p>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--dark-soft)', margin: '12px 0 0', fontWeight: 300 }}>
            Cross-referencing 7 sources. Usually about 14 seconds.
          </p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px, 8vw, 80px) clamp(20px, 5vw, 56px)' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <span className="v-eyebrow" style={{ display: 'block', marginBottom: 16 }}>New search</span>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 9vw, 64px)', lineHeight: 1, fontWeight: 400,
          color: 'var(--dark)', margin: '0 0 48px', letterSpacing: -0.8,
        }}>
          Who are you<br />
          <em style={{ color: 'var(--rose)', fontWeight: 300 }}>researching?</em>
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: '20px 28px', background: 'var(--pearl)',
            borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)',
          }}>
            <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>
              His phone number <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(•••) ••• ••••"
              style={{
                width: '100%', border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--dark)',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </div>

          <div style={{
            padding: '20px 28px', background: 'var(--pearl)',
            borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-sm)',
          }}>
            <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>
              His name <em style={{ color: 'var(--mauve)', fontStyle: 'normal', fontSize: 12 }}>(optional — sharpens results)</em>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              style={{
                width: '100%', border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '14px 18px', background: 'var(--deeprose-pale)', borderRadius: 'var(--r-md)',
              fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--deeprose-deep)',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={!phone.trim()}
            style={{
              padding: '20px 32px', borderRadius: 'var(--r-pill)',
              background: phone.trim() ? 'var(--primary)' : 'var(--mauve)',
              color: 'var(--ivory)', border: 'none',
              cursor: phone.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500,
              boxShadow: phone.trim() ? 'var(--shadow-pop)' : 'none',
              width: '100%',
            }}
          >
            Get the report <em style={{ fontWeight: 300 }}>→</em>
          </button>

          <div style={{ textAlign: 'center', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
            Your search is private · He'll never know · Results in ~14 seconds
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <Suspense fallback={<div />}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
