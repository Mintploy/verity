'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import { Sparkle } from '@/components/ui/Sparkle';

interface SavedReport {
  key: string;
  name: string;
  phone: string;
  score: string;
  generatedAt: string;
  searchId: string;
}

function getScoreColor(score: string) {
  if (score === 'green') return { bg: 'var(--sage-pale)', text: 'var(--sage-deep)' };
  if (score === 'red') return { bg: 'var(--deeprose-pale)', text: 'var(--deeprose-deep)' };
  return { bg: 'var(--gold-pale)', text: 'var(--gold-deep)' };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [pastSearches, setPastSearches] = useState<SavedReport[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const router = useRouter();

  const loadPastSearches = () => {
    const reports: SavedReport[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('report-')) {
        try {
          const data = JSON.parse(sessionStorage.getItem(key)!);
          reports.push({
            key,
            name: data.subject?.name ?? 'Unknown',
            phone: data.subject?.phone ?? '—',
            score: data.score ?? 'yellow',
            generatedAt: data.generatedAt ?? '',
            searchId: data.searchId ?? '',
          });
        } catch {}
      }
    }
    reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    setPastSearches(reports);
  };

  useEffect(() => {
    setDemoMode(sessionStorage.getItem('verity-demo') === '1');
    loadPastSearches();
  }, []);

  const deleteSearch = (key: string) => {
    sessionStorage.removeItem(key);
    loadPastSearches();
  };

  const clearAllSearches = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('report-')) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
    setConfirmClearAll(false);
    loadPastSearches();
  };

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

      sessionStorage.setItem(`report-${data.report.searchId}`, JSON.stringify(data.report));
      if (data.demoMode) sessionStorage.setItem('verity-demo', '1');
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(40px, 8vw, 80px) clamp(20px, 5vw, 56px)' }}>
      {demoMode && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: 'var(--gold-pale)', borderRadius: 'var(--r-pill)', marginBottom: 20, fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--gold-deep)', letterSpacing: 0.3 }}>
          Demo mode — sample data, not real records.
        </div>
      )}
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
          <div style={{ padding: '20px 28px', background: 'var(--pearl)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)' }}>
            <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>
              His phone number <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(•••) ••• ••••"
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--serif)', fontSize: 32, color: 'var(--dark)', fontVariantNumeric: 'tabular-nums' }}
            />
          </div>

          <div style={{ padding: '20px 28px', background: 'var(--pearl)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-sm)' }}>
            <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>
              His name <em style={{ color: 'var(--mauve)', fontStyle: 'normal', fontSize: 12 }}>(optional — sharpens results)</em>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)' }}
            />
          </div>

          {error && (
            <div style={{ padding: '14px 18px', background: 'var(--deeprose-pale)', borderRadius: 'var(--r-md)', fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--deeprose-deep)' }}>
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

        {pastSearches.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="v-eyebrow">Recent searches</span>
              {!confirmClearAll ? (
                <button onClick={() => setConfirmClearAll(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', letterSpacing: 0.3, textDecoration: 'underline' }}>
                  Clear all
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)' }}>Are you sure?</span>
                  <button onClick={clearAllSearches} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--deeprose-deep)', fontWeight: 600 }}>Yes, clear all</button>
                  <button onClick={() => setConfirmClearAll(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)' }}>Cancel</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastSearches.map((s) => {
                const scoreColor = getScoreColor(s.score);
                const date = s.generatedAt ? new Date(s.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--pearl)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', gap: 12 }}>
                    <div onClick={() => router.push(`/report/${s.searchId}`)} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: 'pointer' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: scoreColor.text }} />
                      <div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--dark)' }}>{s.name}</div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', marginTop: 2 }}>{s.phone} · {date}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', background: scoreColor.bg, color: scoreColor.text, fontFamily: 'var(--sans)', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                        {s.score}
                      </span>
                      <button onClick={() => deleteSearch(s.key)} title="Delete this search" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mauve)', padding: '4px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M5 3.5l.5 8M9 3.5l-.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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