'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import { clearPendingPhone, getPendingPhone } from '@/lib/pending';
import { Sparkle } from '@/components/ui/Sparkle';

interface SavedReport {
  key: string;
  name: string;
  phone: string;
  score: string;
  generatedAt: string;
  searchId: string;
}

type Mode = 'phone' | 'name' | 'email' | 'address';

// Phone stays first and is the default: it is the strongest identifier
// Enformion accepts and the one this product is built around. The others widen
// the entry points without displacing it.
const MODES: Array<{
  id: Mode;
  label: string;
  label2: string;
  placeholder: string;
  inputType: string;
  secondary?: { label: string; hint: string; placeholder: string };
}> = [
  {
    id: 'phone', label: 'Phone', label2: 'His phone number',
    placeholder: '(•••) ••• ••••', inputType: 'tel',
    secondary: { label: 'His name', hint: '(optional — sharpens results)', placeholder: 'First and last name' },
  },
  {
    id: 'name', label: 'Name', label2: 'His full name',
    placeholder: 'First and last name', inputType: 'text',
    secondary: { label: 'Where he lives', hint: '(optional — narrows a common name)', placeholder: 'City, State or ZIP' },
  },
  {
    id: 'email', label: 'Email', label2: 'His email address',
    placeholder: 'name@example.com', inputType: 'email',
  },
  {
    id: 'address', label: 'Address', label2: 'His street address',
    placeholder: '123 Park Ave', inputType: 'text',
    secondary: { label: 'City, State or ZIP', hint: '(recommended)', placeholder: 'Los Angeles, CA' },
  },
];

function getScoreColor(score: string) {
  if (score === 'green') return { bg: 'var(--sage-pale)', text: 'var(--sage-deep)' };
  if (score === 'red') return { bg: 'var(--deeprose-pale)', text: 'var(--deeprose-deep)' };
  return { bg: 'var(--gold-pale)', text: 'var(--gold-deep)' };
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('phone');
  const [primary, setPrimary] = useState(searchParams.get('phone') ?? '');
  const [secondary, setSecondary] = useState('');
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

    // She typed his number before she had an account and has now arrived with
    // one — most often from the welcome email. Take her to the picker for that
    // number instead of a search box she has already filled in.
    const pendingPhone = getPendingPhone();
    const pending = sessionStorage.getItem('verity-pending-candidate');
    if (!pending && pendingPhone) {
      clearPendingPhone();
      router.replace(`/matches?phone=${pendingPhone}`);
      return;
    }

    // She picked a man on /matches, then went away to log in or to verify.
    // Landing her on an empty search box would make her choose him twice, so
    // resume where she left off and build the file she already asked for.
    if (!pending) return;
    sessionStorage.removeItem('verity-pending-candidate');
    try {
      const { token } = JSON.parse(pending);
      if (!token) return;
      setLoading(true);
      fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateToken: token }),
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error ?? 'Could not build the report');
          sessionStorage.setItem(`report-${d.report.searchId}`, JSON.stringify(d.report));
          if (d.demoMode) sessionStorage.setItem('verity-demo', '1');
          router.push(`/report/${d.report.searchId}`);
        })
        .catch((e: any) => { setError(e.message); setLoading(false); });
    } catch {
      // A malformed hand-off is not worth surfacing; she can just search again.
    }
  }, [router]);

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

  const activeMode = MODES.find(m => m.id === mode)!;
  const canSearch = primary.trim().length > 0;

  // Which field the typed value maps to depends on the active tab; the
  // secondary box is the name on a phone search and the location otherwise.
  const buildQuery = () => {
    const value = primary.trim();
    const extra = secondary.trim() || undefined;
    switch (mode) {
      case 'phone': return { phone: value, name: extra };
      case 'name': return { name: value, location: extra };
      case 'email': return { email: value };
      case 'address': return { address: value, location: extra };
    }
  };

  const handleSearch = async () => {
    if (!canSearch) return;

    // A phone search goes through the picker, because a number can sit on
    // several people and only she knows which one she means. The picker was
    // wired to the landing hero, which a signed-in member never sees — so
    // every search from this page was still being auto-resolved by
    // pickBestMatch, which is the guess the picker exists to replace.
    //
    // The other three modes have no candidate step: the reverse-phone lookup
    // that produces candidates is phone-only, so they keep the direct path.
    if (mode === 'phone') {
      const digits = primary.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
      if (digits.length === 10) {
        setLoading(true);
        router.push(`/matches?phone=${digits}`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildQuery()),
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

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setError(null); }}
              style={{
                flex: '1 1 0', minWidth: 80, padding: '10px 12px',
                borderRadius: 'var(--r-md)', cursor: 'pointer',
                border: mode === m.id ? '1px solid var(--primary)' : '1px solid transparent',
                background: mode === m.id ? 'var(--pearl)' : 'transparent',
                color: mode === m.id ? 'var(--primary)' : 'var(--mauve-deep)',
                fontFamily: 'var(--sans)', fontSize: 13,
                fontWeight: mode === m.id ? 600 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '20px 28px', background: 'var(--pearl)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-md)' }}>
            <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>
              {activeMode.label2} <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <input
              type={activeMode.inputType}
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              placeholder={activeMode.placeholder}
              style={{
                width: '100%', border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--serif)', color: 'var(--dark)',
                fontSize: mode === 'phone' ? 32 : 24,
                ...(mode === 'phone' ? { fontVariantNumeric: 'tabular-nums' as const } : {}),
              }}
            />
          </div>

          {activeMode.secondary && (
            <div style={{ padding: '20px 28px', background: 'var(--pearl)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-sm)' }}>
              <label style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--mauve-deep)', display: 'block', marginBottom: 8 }}>
                {activeMode.secondary.label} <em style={{ color: 'var(--mauve)', fontStyle: 'normal', fontSize: 12 }}>{activeMode.secondary.hint}</em>
              </label>
              <input
                type="text"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                placeholder={activeMode.secondary.placeholder}
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)' }}
              />
            </div>
          )}

          {error && (
            <div style={{ padding: '14px 18px', background: 'var(--deeprose-pale)', borderRadius: 'var(--r-md)', fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--deeprose-deep)' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={!canSearch}
            style={{
              padding: '20px 32px', borderRadius: 'var(--r-pill)',
              background: canSearch ? 'var(--primary)' : 'var(--mauve)',
              color: 'var(--ivory)', border: 'none',
              cursor: canSearch ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500,
              boxShadow: canSearch ? 'var(--shadow-pop)' : 'none',
              width: '100%',
            }}
          >
            Get the report <em style={{ fontWeight: 300 }}>→</em>
          </button>

          <div style={{ textAlign: 'center', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--mauve-deep)', letterSpacing: 0.3 }}>
            Your search is private · Results in ~14 seconds
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