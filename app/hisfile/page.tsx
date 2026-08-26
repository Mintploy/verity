'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav/Nav';
import type { HisFile } from '@/lib/hisfile';

const STATUSES = ['all', 'talking', 'dating', 'met', 'ghosted', 'blocked', 'archived'];

function scoreColor(s?: string) {
  if (s === 'green') return { bg: 'var(--sage-pale)', dot: 'var(--sage)', text: 'var(--sage-deep)' };
  if (s === 'red') return { bg: 'var(--deeprose-pale)', dot: 'var(--deeprose)', text: 'var(--deeprose-deep)' };
  if (s === 'yellow') return { bg: 'var(--honey-pale)', dot: 'var(--honey)', text: 'var(--honey-deep)' };
  return { bg: 'var(--ivory-warm)', dot: 'var(--mauve)', text: 'var(--mauve-deep)' };
}

function statusColor(s?: string) {
  const map: Record<string, { bg: string; text: string }> = {
    talking: { bg: 'var(--primary-mist)', text: 'var(--primary-deep)' },
    dating: { bg: 'var(--blush-pale)', text: 'var(--wine)' },
    met: { bg: 'var(--gold-pale)', text: 'var(--gold-deep)' },
    ghosted: { bg: 'var(--ivory-warm)', text: 'var(--dark-soft)' },
    blocked: { bg: 'var(--deeprose-pale)', text: 'var(--deeprose-deep)' },
    archived: { bg: 'var(--ivory-deep)', text: 'var(--mauve-deep)' },
  };
  return s ? (map[s] ?? { bg: 'var(--ivory-warm)', text: 'var(--dark-soft)' }) : { bg: 'var(--ivory-warm)', text: 'var(--dark-soft)' };
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(file => {
              const sc = scoreColor(file.safety_score);
              const st = statusColor(file.status);
              const nick = file.nickname || 'Unnamed';
              const isConfirming = confirmDeleteId === file.id;
              const isDeleting = deletingId === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => router.push(`/hisfile/${file.id}`)}
                  style={{
                    padding: '18px 22px', borderRadius: 'var(--r-lg)',
                    background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)',
                    display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'box-shadow 0.15s, transform 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  {/* Safety score dot */}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.dot, flexShrink: 0, boxShadow: `0 0 0 3px ${sc.bg}` }} />

                  {/* Avatar */}
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--ivory-warm), var(--champagne))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18,
                    color: 'var(--dark-soft)', border: '2px solid var(--gold-pale)',
                  }}>
                    {initials(nick)}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)', fontWeight: 400 }}>{nick}</span>
                      {file.full_name && (
                        <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)', opacity: 0.7 }}>({file.full_name})</span>
                      )}
                      {file.star_sign && (
                        <span style={{ fontSize: 14 }} title={file.star_sign}>{starSignEmoji(file.star_sign)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                      {file.phone && <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)', opacity: 0.65 }}>{file.phone}</span>}
                      {file.researched_at && <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)' }}>{formatDate(file.researched_at)}</span>}
                      {file.compatibility_score !== undefined && file.compatibility_score !== null && (
                        <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--gold-deep)' }}>
                          ♡ {file.compatibility_score}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status pill */}
                  {file.status && (
                    <div style={{
                      padding: '5px 12px', borderRadius: 'var(--r-pill)',
                      background: st.bg, color: st.text,
                      fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500,
                      letterSpacing: 0.2, textTransform: 'capitalize',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {file.status}
                    </div>
                  )}

                  {/* Delete button */}
                  {isConfirming ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => deleteFile(file.id!, e)}
                        disabled={isDeleting}
                        style={{
                          padding: '5px 12px', borderRadius: 'var(--r-pill)',
                          background: 'var(--deeprose)', border: 'none',
                          color: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 11,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        {isDeleting ? '...' : 'Confirm'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        style={{
                          padding: '5px 10px', borderRadius: 'var(--r-pill)',
                          background: 'var(--pearl)', border: '1px solid var(--gold-pale)',
                          color: 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={e => deleteFile(file.id!, e)}
                      title="Delete file"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--mauve)', fontSize: 15, padding: '4px 6px',
                        borderRadius: 'var(--r-sm)', flexShrink: 0,
                        opacity: 0.5, transition: 'opacity 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = 'var(--deeprose)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.color = 'var(--mauve)'; }}
                    >
                      ✕
                    </button>
                  )}
                </div>
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

function starSignEmoji(sign: string): string {
  const map: Record<string, string> = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };
  return map[sign] ?? '✦';
}
