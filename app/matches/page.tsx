'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import { clearPendingPhone, setPendingPhone } from '@/lib/pending';

interface Candidate {
  token: string;
  name: string;
  age?: number;
  city?: string;
  state?: string;
}

/** Survives the trip through login or checkout, so her choice is not lost. */
const PENDING_KEY = 'verity-pending-candidate';

function formatPhone(digits: string): string {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

function MatchesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = (params.get('phone') ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Candidate | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (phone.length !== 10) {
      setError('Enter a 10-digit US phone number to search.');
      setCandidates([]);
      return;
    }
    // Members only. A woman who has not verified and paid is sent into the
    // funnel with his number kept, rather than being shown a locked door.
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((me) => {
        if (!me.authenticated) {
          setPendingPhone(phone);
          router.replace('/verify');
          return Promise.reject(new Error('redirecting'));
        }
        return fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
      })
      .then(async (r) => {
        if (!r) return;
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Search failed');
        clearPendingPhone();
        setCandidates(d.candidates ?? []);
      })
      .catch((e) => {
        if (e?.message === 'redirecting') return;
        setError(e.message);
        setCandidates([]);
      });
  }, [phone, router]);

  // Runs the paid half of the pipeline for the man she picked.
  const buildReport = useCallback(async (token: string) => {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not build the report');

      sessionStorage.setItem(`report-${data.report.searchId}`, JSON.stringify(data.report));
      if (data.demoMode) sessionStorage.setItem('verity-demo', '1');
      sessionStorage.removeItem(PENDING_KEY);
      router.push(`/report/${data.report.searchId}`);
    } catch (e: any) {
      setError(e.message);
      setBuilding(false);
    }
  }, [router]);

  const select = (c: Candidate) => {
    setChosen(c);
    setError(null);
    // Held anyway: a session can lapse between landing here and choosing, and
    // re-picking a man she already chose is the kind of small insult that
    // loses her. /search resumes it on the way back.
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ token: c.token, name: c.name }));
    buildReport(c.token);
  };

  if (building) {
    return (
      <Centered>
        <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, color: 'var(--dark)' }}>
          Building {chosen?.name.split(' ')[0]}&rsquo;s file&hellip;
        </p>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', marginTop: 10 }}>
          This takes about fourteen seconds.
        </p>
      </Centered>
    );
  }

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,32px)' }}>

        <div className="v-eyebrow" style={{ marginBottom: 8 }}>Step one</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 'clamp(28px,5vw,44px)', fontWeight: 400,
          lineHeight: 1.05, color: 'var(--dark)', margin: '0 0 10px', letterSpacing: -0.4,
        }}>
          Which one is <em>him</em>?
        </h1>
        <p style={{ fontFamily: 'var(--sans)', fontSize: 14.5, color: 'var(--dark-soft)', fontWeight: 300, lineHeight: 1.6, margin: '0 0 28px' }}>
          {candidates === null
            ? `Looking up ${formatPhone(phone)}…`
            : candidates.length > 1
              ? `${candidates.length} people have been associated with ${formatPhone(phone)}. Numbers get reused and shared, so pick the man you mean — we will only build his file.`
              : candidates.length === 1
                ? `One person is associated with ${formatPhone(phone)}.`
                : `We found no one on ${formatPhone(phone)}.`}
        </p>

        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--r-md)', marginBottom: 20,
            background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)',
            fontFamily: 'var(--sans)', fontSize: 13.5,
          }}>{error}</div>
        )}

        {candidates === null && <Skeleton />}

        {candidates?.map((c) => {
          const isChosen = chosen?.token === c.token;
          return (
            <div key={c.token}>
              <button
                onClick={() => select(c)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16, marginBottom: 12,
                  padding: '20px 24px', borderRadius: 'var(--r-lg)',
                  background: 'var(--pearl)', cursor: 'pointer',
                  border: isChosen ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span>
                  <span style={{ display: 'block', fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--dark)', lineHeight: 1.2 }}>
                    {c.name}
                  </span>
                  <span style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', marginTop: 4 }}>
                    {[c.age ? `Age ${c.age}` : null, [c.city, c.state].filter(Boolean).join(', ') || null]
                      .filter(Boolean).join(' · ') || 'Details in the full file'}
                  </span>
                </span>
                <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--primary-deep)', whiteSpace: 'nowrap' }}>
                  See his file →
                </span>
              </button>
            </div>
          );
        })}

        {candidates?.length === 0 && !error && (
          <div style={{ padding: '24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', lineHeight: 1.6, margin: 0 }}>
              Nothing is publicly associated with that number. That is not itself a red flag —
              a new line or a privacy-conscious carrier both look like this. Try a different
              number, or search by name instead.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          height: 86, marginBottom: 12, borderRadius: 'var(--r-lg)',
          background: 'var(--pearl)', opacity: 1 - i * 0.25,
        }} />
      ))}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<Centered><p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--dark-soft)' }}>Loading&hellip;</p></Centered>}>
      <MatchesInner />
    </Suspense>
  );
}
