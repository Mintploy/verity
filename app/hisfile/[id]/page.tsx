'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import type { HisFile } from '@/lib/hisfile';

const APPS = ['Hinge', 'Tinder', 'Bumble', 'Coffee Meets Bagel', 'The League', 'Feeld', 'IRL', 'Instagram', 'Other'];
const STATUSES = ['talking', 'dating', 'met', 'ghosted', 'blocked', 'archived'];
const GENEROSITY = ['cheap', 'average', 'generous', 'spoils me'];
const COMMON_ICKS = ['bad hygiene', 'late texter', 'love bombing', 'too intense', 'cheap on dates', 'talks over me', 'dismissive', 'no depth', 'all about looks', 'mommy issues', 'oversharing', 'flaky'];

function starSignEmoji(sign?: string): string {
  if (!sign) return '';
  const map: Record<string, string> = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
    Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
  };
  return map[sign] ?? '✦';
}

function compatBar(score?: number) {
  if (!score) return null;
  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'var(--sage)' : score >= 6 ? 'var(--honey)' : 'var(--deeprose)';
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)' }}>Compatibility</span>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 15, color, fontWeight: 500 }}>{score}/10</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--ivory-warm)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

export default function HisFileDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [file, setFile] = useState<HisFile>({ nickname: '' });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ickInput, setIckInput] = useState('');

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/hisfile/${id}`)
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        if (r.status === 404) { router.push('/hisfile'); return null; }
        return r.json();
      })
      .then(d => { if (d?.file) setFile(d.file); })
      .finally(() => setLoading(false));
  }, [id, isNew, router]);

  const save = async () => {
    setSaving(true);
    try {
      const method = isNew ? 'POST' : 'PATCH';
      const url = isNew ? '/api/hisfile' : `/api/hisfile/${id}`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(file) });
      const data = await res.json();
      if (data.file) {
        setFile(data.file);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (isNew) router.replace(`/hisfile/${data.file.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setDeleting(true);
    await fetch(`/api/hisfile/${id}`, { method: 'DELETE' });
    router.push('/hisfile');
  };

  const addIck = (ick: string) => {
    const trimmed = ick.trim();
    if (!trimmed) return;
    const existing = file.icks ?? [];
    if (!existing.includes(trimmed)) setFile(f => ({ ...f, icks: [...existing, trimmed] }));
    setIckInput('');
  };

  const removeIck = (ick: string) => {
    setFile(f => ({ ...f, icks: (f.icks ?? []).filter(i => i !== ick) }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
        <Nav />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--dark-soft)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ivory)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <Link href="/hisfile" style={{ color: 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 13, opacity: 0.7, textDecoration: 'none' }}>
            ← His File
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div className="v-eyebrow" style={{ marginBottom: 6 }}>
              {isNew ? 'New entry' : 'Edit entry'}
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px,5vw,42px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--dark)', margin: 0, letterSpacing: -0.4 }}>
              {file.nickname || <em style={{ color: 'var(--mauve)' }}>Unnamed</em>}
            </h1>
            {file.star_sign && (
              <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--gold-deep)', marginTop: 6 }}>
                {starSignEmoji(file.star_sign)} {file.star_sign}
              </div>
            )}
          </div>
          {file.report_id && (
            <Link href={`/report/${file.report_id}`} style={{
              padding: '10px 20px', borderRadius: 'var(--r-pill)',
              background: 'var(--pearl)', border: '1px solid var(--gold-pale)',
              color: 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 13,
              textDecoration: 'none',
            }}>
              View report →
            </Link>
          )}
        </div>

        {/* Compatibility */}
        {file.compatibility_score !== undefined && file.compatibility_summary && (
          <div style={{ padding: '20px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
            <div className="v-eyebrow" style={{ marginBottom: 8 }}>Star sign compatibility</div>
            {compatBar(file.compatibility_score)}
            {file.compatibility_summary && (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.6, margin: '12px 0 0' }}>
                "{file.compatibility_summary}"
              </p>
            )}
          </div>
        )}

        {/* Basics */}
        <Section eyebrow="01" title="Basics">
          <Field label="Nickname *">
            <input
              value={file.nickname}
              onChange={e => setFile(f => ({ ...f, nickname: e.target.value }))}
              placeholder="How you know him"
              style={inputStyle}
            />
          </Field>
          <Field label="Status">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setFile(f => ({ ...f, status: s }))} style={{
                  padding: '7px 16px', borderRadius: 'var(--r-pill)',
                  border: file.status === s ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                  background: file.status === s ? 'var(--primary-mist)' : 'var(--pearl)',
                  color: file.status === s ? 'var(--primary-deep)' : 'var(--dark-soft)',
                  fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <TwoCol>
            <Field label="Full name">
              <input value={file.full_name ?? ''} onChange={e => setFile(f => ({ ...f, full_name: e.target.value }))} placeholder="As on his ID" style={inputStyle} />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={file.date_of_birth ?? ''} onChange={e => setFile(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="Phone">
              <input value={file.phone ?? ''} onChange={e => setFile(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={inputStyle} />
            </Field>
            <Field label="His finsta / alt account">
              <input value={file.his_finsta ?? ''} onChange={e => setFile(f => ({ ...f, his_finsta: e.target.value }))} placeholder="@handle" style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Notes">
            <textarea
              value={file.notes ?? ''}
              onChange={e => setFile(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anything important to remember..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </Field>
        </Section>

        {/* How we met */}
        <Section eyebrow="02" title="How we met">
          <Field label="App / platform">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {APPS.map(a => (
                <button key={a} onClick={() => setFile(f => ({ ...f, met_on_app: a }))} style={{
                  padding: '7px 16px', borderRadius: 'var(--r-pill)',
                  border: file.met_on_app === a ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                  background: file.met_on_app === a ? 'var(--primary-mist)' : 'var(--pearl)',
                  color: file.met_on_app === a ? 'var(--primary-deep)' : 'var(--dark-soft)',
                  fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer',
                }}>
                  {a}
                </button>
              ))}
            </div>
          </Field>
          <TwoCol>
            <Field label="Where we met">
              <input value={file.where_we_met ?? ''} onChange={e => setFile(f => ({ ...f, where_we_met: e.target.value }))} placeholder="In person, online..." style={inputStyle} />
            </Field>
            <Field label="Date met">
              <input type="date" value={file.met_date ?? ''} onChange={e => setFile(f => ({ ...f, met_date: e.target.value }))} style={inputStyle} />
            </Field>
          </TwoCol>
        </Section>

        {/* First date */}
        <Section eyebrow="03" title="First date">
          <TwoCol>
            <Field label="Location">
              <input value={file.first_date_location ?? ''} onChange={e => setFile(f => ({ ...f, first_date_location: e.target.value }))} placeholder="Restaurant, bar..." style={inputStyle} />
            </Field>
            <Field label="Date">
              <input type="date" value={file.first_date_date ?? ''} onChange={e => setFile(f => ({ ...f, first_date_date: e.target.value }))} style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Who paid?">
            {(['split', 'he paid', 'i paid', 'neither'] as const).map(opt => (
              <button key={opt} onClick={() => setFile(f => ({ ...f, first_date_paid: opt }))} style={{
                padding: '7px 16px', borderRadius: 'var(--r-pill)', marginRight: 8, marginBottom: 8,
                border: file.first_date_paid === opt ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                background: file.first_date_paid === opt ? 'var(--primary-mist)' : 'var(--pearl)',
                color: file.first_date_paid === opt ? 'var(--primary-deep)' : 'var(--dark-soft)',
                fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {opt}
              </button>
            ))}
          </Field>
        </Section>

        {/* Financial signals */}
        <Section eyebrow="04" title="Financial signals">
          <Field label="Generosity rating">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GENEROSITY.map(g => (
                <button key={g} onClick={() => setFile(f => ({ ...f, generosity_rating: g }))} style={{
                  padding: '7px 16px', borderRadius: 'var(--r-pill)',
                  border: file.generosity_rating === g ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                  background: file.generosity_rating === g ? 'var(--primary-mist)' : 'var(--pearl)',
                  color: file.generosity_rating === g ? 'var(--primary-deep)' : 'var(--dark-soft)',
                  fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Accurate salary (if known)">
            <input value={file.accurate_salary ?? ''} onChange={e => setFile(f => ({ ...f, accurate_salary: e.target.value }))} placeholder="e.g. $120k/yr" style={inputStyle} />
          </Field>
        </Section>

        {/* The Ick */}
        <Section eyebrow="05" title="The Ick">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {(file.icks ?? []).map(ick => (
              <div key={ick} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 'var(--r-pill)',
                background: 'var(--deeprose-pale)', color: 'var(--deeprose-deep)',
                fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 500,
              }}>
                {ick}
                <button onClick={() => removeIck(ick)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--deeprose-deep)', padding: '0 0 0 2px', fontSize: 14, lineHeight: 1,
                }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={ickInput}
              onChange={e => setIckInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIck(ickInput); } }}
              placeholder="Type an ick and press Enter"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={() => addIck(ickInput)} style={{
              padding: '10px 16px', borderRadius: 'var(--r-md)',
              background: 'var(--primary)', color: 'var(--ivory)',
              border: 'none', fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer',
            }}>Add</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COMMON_ICKS.map(ick => (
              <button
                key={ick}
                onClick={() => addIck(ick)}
                disabled={(file.icks ?? []).includes(ick)}
                style={{
                  padding: '5px 12px', borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--gold-pale)',
                  background: (file.icks ?? []).includes(ick) ? 'var(--deeprose-pale)' : 'var(--pearl)',
                  color: (file.icks ?? []).includes(ick) ? 'var(--deeprose-deep)' : 'var(--dark-soft)',
                  fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer', opacity: (file.icks ?? []).includes(ick) ? 0.5 : 1,
                }}
              >
                {ick}
              </button>
            ))}
          </div>
        </Section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={save} disabled={saving || !file.nickname} style={{
              padding: '14px 32px', borderRadius: 'var(--r-pill)',
              background: !file.nickname ? 'var(--mauve)' : 'var(--primary)',
              color: 'var(--ivory)', border: 'none',
              fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500,
              cursor: file.nickname ? 'pointer' : 'not-allowed',
              boxShadow: file.nickname ? 'var(--shadow-pop)' : 'none',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save file'}
            </button>
          </div>
          {!isNew && (
            <div>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} style={{
                  padding: '14px 24px', borderRadius: 'var(--r-pill)',
                  background: 'transparent', border: '1px solid var(--deeprose-pale)',
                  color: 'var(--deeprose-deep)', fontFamily: 'var(--sans)', fontSize: 13,
                  cursor: 'pointer',
                }}>
                  Delete
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)' }}>Are you sure?</span>
                  <button onClick={del} disabled={deleting} style={{
                    padding: '10px 20px', borderRadius: 'var(--r-pill)',
                    background: 'var(--deeprose)', border: 'none',
                    color: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 13,
                    cursor: 'pointer',
                  }}>
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{
                    padding: '10px 20px', borderRadius: 'var(--r-pill)',
                    background: 'var(--pearl)', border: '1px solid var(--gold-pale)',
                    color: 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 13,
                    cursor: 'pointer',
                  }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--gold-pale)', background: 'var(--ivory)',
  fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--dark)',
  outline: 'none', boxSizing: 'border-box',
};

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px 16px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blush-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--gold)' }}>{eyebrow}</span>
        </div>
        <div>
          <div className="v-eyebrow" style={{ fontSize: 10, marginBottom: 1 }}>Section {eyebrow}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--dark)', fontWeight: 400 }}>{title}</div>
        </div>
      </div>
      <div style={{ padding: '4px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--gold-deep)', letterSpacing: 0.2, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {children}
    </div>
  );
}
