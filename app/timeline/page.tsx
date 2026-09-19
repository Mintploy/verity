'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import type { HisFile } from '@/lib/hisfile';
import type { Milestone } from '@/lib/journal';
import { daysBetween, describeGap, describeSince } from '@/lib/milestones';

/**
 * Every milestone from every dating file on one axis, oldest first, each
 * one carrying the man it belongs to. Dating files only: a safety check has
 * no milestones worth a timeline. Any signed-in member; the journal is free.
 */

interface Entry extends Milestone {
  fileId: string;
  who: string;
  status?: string;
}

const PALETTE = ['var(--primary)', 'var(--sage-deep)', 'var(--honey, var(--gold))', 'var(--deeprose)', 'var(--wine)', 'var(--mauve-deep)'];

export default function TimelinePage() {
  const router = useRouter();
  const [files, setFiles] = useState<HisFile[] | null>(null);
  const [only, setOnly] = useState<string | 'all'>('all');

  useEffect(() => {
    fetch('/api/hisfile')
      .then(r => { if (r.status === 401) { router.push('/login'); return null; } return r.json(); })
      .then(d => { if (d) setFiles((d.files ?? []) as HisFile[]); })
      .catch(() => setFiles([]));
  }, [router]);

  const dating = useMemo(() => (files ?? []).filter(f => (f.file_type ?? 'dating') === 'dating'), [files]);

  const men = useMemo(() => dating
    .filter(f => (f.milestones ?? []).length > 0)
    .map((f, i) => ({ id: f.id!, name: f.nickname || f.full_name || 'Unnamed', color: PALETTE[i % PALETTE.length], count: (f.milestones ?? []).length })),
  [dating]);

  const entries = useMemo(() => {
    const all: Entry[] = [];
    for (const f of dating) {
      for (const m of f.milestones ?? []) {
        all.push({ ...m, fileId: f.id!, who: f.nickname || f.full_name || 'Unnamed', status: f.status });
      }
    }
    return all
      .filter(e => only === 'all' || e.fileId === only)
      .sort((a, b) => a.date.localeCompare(b.date) || a.who.localeCompare(b.who));
  }, [dating, only]);

  const colorOf = (fileId: string) => men.find(m => m.id === fileId)?.color ?? 'var(--primary)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <div className="v-eyebrow" style={{ marginBottom: 10 }}>Your timeline</div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--dark)', margin: 0, letterSpacing: -0.5 }}>
            The dates that mattered.
          </h1>
          <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', margin: '10px 0 0', fontWeight: 300, lineHeight: 1.6 }}>
            Every milestone you have marked, across every man, in the order they happened. Only you can see this.
          </p>
        </div>

        {files === null ? (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--dark-soft)' }}>Loading...</p>
        ) : men.length === 0 ? (
          <div style={{ padding: '28px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)' }}>Nothing marked yet.</p>
            <p style={{ margin: '8px 0 0', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark-soft)', fontWeight: 300, lineHeight: 1.6 }}>
              Open a man&rsquo;s file and add a milestone under &ldquo;Milestones&rdquo;: the first date, the first kiss, the day it became exclusive. They all land here.
            </p>
            <Link href="/hisfile" style={{ display: 'inline-block', marginTop: 16, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--primary-deep)', textDecoration: 'underline' }}>Go to His File</Link>
          </div>
        ) : (
          <>
            {/* Who is on the axis. Tap one to see only him. */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              <button onClick={() => setOnly('all')} style={{ padding: '7px 14px', borderRadius: 'var(--r-pill)', border: only === 'all' ? '1.5px solid var(--dark)' : '1.5px solid var(--gold-pale)', background: only === 'all' ? 'var(--dark)' : 'var(--pearl)', color: only === 'all' ? 'var(--ivory)' : 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 12.5, cursor: 'pointer' }}>
                Everyone
              </button>
              {men.map(m => (
                <button key={m.id} onClick={() => setOnly(only === m.id ? 'all' : m.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 'var(--r-pill)', border: only === m.id ? `1.5px solid ${m.color}` : '1.5px solid var(--gold-pale)', background: 'var(--pearl)', color: 'var(--dark)', fontFamily: 'var(--sans)', fontSize: 12.5, cursor: 'pointer' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                  {m.name} <span style={{ color: 'var(--mauve-deep)' }}>{m.count}</span>
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', paddingLeft: 26, borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', padding: '24px 24px 24px 46px' }}>
              <div style={{ position: 'absolute', left: 24, top: 24, bottom: 24, width: 2, background: 'var(--gold-pale)' }} />
              {entries.map((e, i) => {
                const prev = entries[i - 1];
                const newYear = !prev || prev.date.slice(0, 4) !== e.date.slice(0, 4);
                return (
                  <div key={`${e.fileId}-${e.id}`} style={{ position: 'relative', paddingBottom: i === entries.length - 1 ? 0 : 20 }}>
                    {newYear && (
                      <div style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: 1, color: 'var(--gold-deep)', marginBottom: 10, marginLeft: -2 }}>{e.date.slice(0, 4)}</div>
                    )}
                    <div style={{ position: 'absolute', left: -28, top: newYear ? 30 : 5, width: 12, height: 12, borderRadius: '50%', background: colorOf(e.fileId), border: '2px solid var(--pearl)' }} />
                    {prev && !newYear && prev.fileId === e.fileId && (
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', marginBottom: 5 }}>{describeGap(daysBetween(prev.date, e.date))} later</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <Link href={`/hisfile/${e.fileId}`} style={{ fontFamily: 'var(--sans)', fontSize: 11.5, fontWeight: 500, color: colorOf(e.fileId), textDecoration: 'none', letterSpacing: 0.2, textTransform: 'uppercase' }}>{e.who}</Link>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--dark)', marginTop: 1 }}>{e.label}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', whiteSpace: 'nowrap' }}>
                        {new Date(`${e.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {describeSince(e.date)}
                      </div>
                    </div>
                    {e.note && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--dark-soft)', marginTop: 4, lineHeight: 1.45 }}>{e.note}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
