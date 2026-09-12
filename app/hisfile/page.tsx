'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import { FileFolder } from '@/components/hisfile/FileFolder';
import type { HisFile } from '@/lib/hisfile';

const STATUSES = ['all', 'talking', 'dating', 'met', 'ghosted', 'blocked', 'archived'];

export default function HisFilePage() {
  const router = useRouter();
  const [files, setFiles] = useState<HisFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [hasDob, setHasDob] = useState<boolean | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/hisfile').then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      }),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([fileData, profileData]) => {
      if (fileData) setFiles(fileData.files ?? []);
      setHasDob(!!profileData?.profile?.date_of_birth);
    }).catch(() => setError('Could not load your files.')).finally(() => setLoading(false));
  }, [router]);

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setDeletingId(id);
    await fetch(`/api/hisfile/${id}`, { method: 'DELETE' });
    setFiles(prev => prev.filter(f => f.id !== id));
    setConfirmDeleteId(null);
    setDeletingId(null);
  };

  const filtered = activeTab === 'all' ? files : files.filter(f => f.status === activeTab);

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="v-eyebrow" style={{ marginBottom: 8 }}>Your private vault</div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px,5vw,48px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--dark)', margin: 0, letterSpacing: -0.5 }}>
              His <em style={{ color: 'var(--primary)' }}>File</em>
            </h1>
          </div>
          <Link href="/search" style={{
            padding: '12px 24px', borderRadius: 'var(--r-pill)',
            background: 'var(--primary)', color: 'var(--ivory)',
            fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500,
            textDecoration: 'none', boxShadow: 'var(--shadow-pop)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            + New search
          </Link>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              style={{
                padding: '7px 16px', borderRadius: 'var(--r-pill)',
                border: activeTab === s ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                background: activeTab === s ? 'var(--primary-mist)' : 'var(--pearl)',
                color: activeTab === s ? 'var(--primary-deep)' : 'var(--dark-soft)',
                fontFamily: 'var(--sans)', fontSize: 13, fontWeight: activeTab === s ? 500 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {s}
              {s !== 'all' && (
                <span style={{ marginLeft: 6, opacity: 0.55, fontSize: 11 }}>
                  {files.filter(f => f.status === s).length || ''}
                </span>
              )}
              {s === 'all' && (
                <span style={{ marginLeft: 6, opacity: 0.55, fontSize: 11 }}>{files.length || ''}</span>
              )}
            </button>
          ))}
        </div>

        {/* Birthday prompt — shown once profile is loaded and DOB is missing */}
        {!loading && hasDob === false && (
          <Link href="/settings" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
            <div style={{
              padding: '16px 20px', borderRadius: 'var(--r-lg)',
              background: 'var(--blush-pale)', border: '1px solid var(--primary-pale)',
              display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>✦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--dark)', fontWeight: 400 }}>
                  Add your birthday to see compatibility.
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)', marginTop: 3, opacity: 0.75 }}>
                  We'll show how your star sign lines up with each man in your files.
                </div>
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--primary-deep)', fontWeight: 500, flexShrink: 0 }}>
                Go to Settings →
              </div>
            </div>
          </Link>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--dark-soft)' }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{ padding: 20, borderRadius: 'var(--r-lg)', background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)', fontFamily: 'var(--sans)', fontSize: 14 }}>
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'clamp(40px, 8vw, 80px) 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--blush-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🗂️</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--dark)', lineHeight: 1.2 }}>
              {activeTab === 'all' ? <>No files yet.<br /><em style={{ color: 'var(--gold)' }}>Run your first search to get started.</em></> : `No one in "${activeTab}" yet.`}
            </div>
            {activeTab === 'all' && (
              <Link href="/search" style={{ marginTop: 8, padding: '12px 28px', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--ivory)', fontFamily: 'var(--serif)', fontSize: 15, textDecoration: 'none', boxShadow: 'var(--shadow-pop)' }}>
                Search a man
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((file, i) => {
              const isConfirming = confirmDeleteId === file.id;
              const isDeleting = deletingId === file.id;
              const onDark = i % 2 === 0;
              return (
                <FileFolder
                  key={file.id}
                  file={file}
                  index={i}
                  onOpen={() => router.push(`/hisfile/${file.id}`)}
                >
                  {isConfirming ? (
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => deleteFile(file.id!, e)}
                        disabled={isDeleting}
                        style={{
                          padding: '5px 12px', borderRadius: 'var(--r-pill)',
                          background: 'var(--deeprose)', border: 'none',
                          color: 'var(--pearl)', fontFamily: 'var(--sans)', fontSize: 11,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {isDeleting ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        style={{
                          padding: '5px 10px', borderRadius: 'var(--r-pill)',
                          background: onDark ? 'rgba(240,176,187,0.18)' : 'var(--ivory-warm)',
                          border: 'none', color: 'inherit',
                          fontFamily: 'var(--sans)', fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={e => deleteFile(file.id!, e)}
                      title="Delete file"
                      aria-label={`Delete ${file.nickname || 'file'}`}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'inherit', fontSize: 15, padding: '4px 6px',
                        borderRadius: 'var(--r-sm)', flexShrink: 0,
                        opacity: 0.45, transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.45'; }}
                    >
                      ✕
                    </button>
                  )}
                </FileFolder>
              );
            })}
          </div>
        )}

        {/* Verity Wrapped CTA */}
        {files.length >= 3 && (
          <div style={{
            marginTop: 32, padding: '24px 28px', borderRadius: 'var(--r-xl)',
            background: 'linear-gradient(135deg, var(--primary-deep) 0%, var(--wine) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
            boxShadow: 'var(--shadow-pop)',
          }}>
            <div>
              <div className="v-eyebrow" style={{ color: 'var(--blush)', marginBottom: 8 }}>Year in review</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ivory)', fontWeight: 400, lineHeight: 1.2 }}>
                Generate your <em style={{ color: 'var(--blush)' }}>Verity Wrapped</em>
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ivory)', opacity: 0.75, marginTop: 6, fontWeight: 300 }}>
                {files.length} men researched — see your year at a glance.
              </div>
            </div>
            <Link href="/wrapped" style={{
              padding: '12px 24px', borderRadius: 'var(--r-pill)',
              background: 'var(--ivory)', color: 'var(--wine)',
              fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              See my Wrapped →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

