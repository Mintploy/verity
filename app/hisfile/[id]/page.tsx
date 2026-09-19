'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/nav/Nav';
import { ChipListEditor } from '@/components/hisfile/ChipListEditor';
import { LovesTable } from '@/components/hisfile/LovesTable';
import { HighlightsCard } from '@/components/hisfile/HighlightsCard';
import type { HisFile, FileType } from '@/lib/hisfile';
import { ickText, type DateEntry, type Feeling, type IckEntry, type Milestone } from '@/lib/journal';
import { allFlagsOn, flagKind, normalizeDateFlags, parseFlagId, type FlagPhase } from '@/lib/signals';
import { FlagRows } from '@/components/hisfile/FlagRows';
import { MILESTONE_SUGGESTIONS, daysBetween, describeGap, describeSince } from '@/lib/milestones';
import { BEFORE_MOODS } from '@/lib/flags';
import { REFLECTION_ITEMS_V1, REFLECTION_VERSION, asAnswer, type ReflectionItem } from '@/lib/reflection';

const APPS = ['Hinge', 'Tinder', 'Bumble', 'Raya', 'Coffee Meets Bagel', 'The League', 'Feeld', 'IRL', 'Instagram', 'Other'];
const FEELINGS: Array<{ value: Feeling; label: string }> = [
  { value: 'loved it', label: 'Loved it' },
  { value: 'good', label: 'Good' },
  { value: 'unsure', label: 'Not sure' },
  { value: 'off', label: 'Something felt off' },
  { value: 'bad', label: 'Bad' },
];
const ICK_TOPICS = ['politics', 'past relationships', 'money', 'family', 'how he treated others', 'texting', 'manners', 'something else'];
const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
const ordinal = (n: number) => ORDINALS[n - 1] ?? `Date ${n}`;
const WHERE_MET_SAFETY = ['Facebook Marketplace', 'Craigslist', 'OfferUp', 'eBay', 'Nextdoor', 'Depop', 'Rideshare', 'Referral', 'Other'];
// Drawn from the same vocabulary as the dating statuses so the filter tabs on
// the His File list keep working for both kinds of entry.
const STATUSES = ['talking', 'dating', 'met', 'ghosted', 'blocked', 'archived'];
const STATUSES_SAFETY = ['met', 'ghosted', 'blocked', 'archived'];
const GENEROSITY = ['cheap', 'average', 'generous', 'spoils me'];
const HE_LOVES_SUGGESTIONS = ['His team', 'His coffee order', "His dog's name", 'His favourite restaurant', 'His go-to drink', 'His music', 'His mom'];
const DONT_FORGET_SUGGESTIONS = ['Ask about his week', 'Mention his birthday', 'Bring up the trip', 'Do not text first'];
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

  const [file, setFile] = useState<HisFile>({ nickname: '', file_type: 'dating' });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);
  // ?highlights=1 shows only the card: the reminder email and the list page's
  // "Before you see him" land here.
  const focus = useSearchParams().get('highlights') === '1';
  const [ickDate, setIckDate] = useState<number | ''>('');
  const [ickTopic, setIckTopic] = useState('');
  const [hasDob, setHasDob] = useState<boolean | null>(null);
  // Her own green and red flags, from Settings. They lead the During chips.
  const [myFlags, setMyFlags] = useState<{ green: string[]; red: string[] }>({ green: [], red: [] });
  const [quickSaving, setQuickSaving] = useState<number | null>(null);
  // How often she has tapped each flag across every file. Orders the chip rows.
  const [flagUsage, setFlagUsage] = useState<Record<string, number>>({});
  // Which of Before / During / After is open on each date card. Unset means
  // "whatever the date's timing suggests", see phaseDefaults.
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const phaseKey = (number: number, phase: Phase) => `${number}:${phase}`;
  const togglePhase = (number: number, phase: Phase, fallback: boolean) =>
    setOpenPhases(o => ({ ...o, [phaseKey(number, phase)]: !(o[phaseKey(number, phase)] ?? fallback) }));

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      setHasDob(!!d?.profile?.date_of_birth);
      setMyFlags({
        green: Array.isArray(d?.profile?.personal_flags?.green) ? d.profile.personal_flags.green : [],
        red: Array.isArray(d?.profile?.personal_flags?.red) ? d.profile.personal_flags.red : [],
      });
    }).catch(() => {});
    if (isNew) return;
    fetch(`/api/hisfile/${id}`)
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        if (r.status === 404) { router.push('/hisfile'); return null; }
        return r.json();
      })
      .then(d => { if (d?.file) setFile(withFlagIds(d.file)); })
      .finally(() => setLoading(false));
    fetch('/api/hisfile').then(r => r.json()).then(d => {
      const counts: Record<string, number> = {};
      for (const f of (d?.files ?? []) as HisFile[]) {
        for (const de of f.dates ?? []) for (const fid of allFlagsOn(de)) counts[fid] = (counts[fid] ?? 0) + 1;
      }
      setFlagUsage(counts);
    }).catch(() => {});
  }, [id, isNew, router]);

  const save = async () => {
    setSaving(true);
    try {
      const method = isNew ? 'POST' : 'PATCH';
      const url = isNew ? '/api/hisfile' : `/api/hisfile/${id}`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(file) });
      const data = await res.json();
      if (data.file) {
        setFile(withFlagIds(data.file));
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

  // Entries created before the split, and any row missing the column, read as
  // dating, that is what the old questionnaire assumed of everyone.
  const fileType: FileType = file.file_type ?? 'dating';
  const isSafety = fileType === 'safety';

  // Date 1 lives in the first_date_* columns on files saved before the journal
  // existed, so the list is seeded from them rather than starting empty.
  const datesOf = (f: HisFile): DateEntry[] => f.dates?.length
    ? f.dates
    : [{ number: 1, date: f.first_date_date, location: f.first_date_location, paid: f.first_date_paid }];
  const dates = datesOf(file);
  const latestDate = dates[dates.length - 1]?.number ?? 1;

  const updateDateWith = (number: number, fn: (d: DateEntry) => Partial<DateEntry>) => {
    setFile(f => {
      const next = datesOf(f).map(d => (d.number === number ? { ...d, ...fn(d) } : d));
      const first = next.find(d => d.number === 1);
      return {
        ...f,
        dates: next,
        first_date_date: first?.date || undefined,
        first_date_location: first?.location,
        first_date_paid: first?.paid,
      };
    });
  };
  const updateDate = (number: number, patch: Partial<DateEntry>) => updateDateWith(number, () => patch);
  /**
   * The after section saves with the form, but its first fill is stamped so
   * "when she wrote this" is known later. The stamp never moves.
   */
  const updateAfter = (number: number, patch: Partial<DateEntry>) => updateDateWith(number, d => ({
    ...patch,
    afterLoggedAt: d.afterLoggedAt ?? new Date().toISOString(),
    reflectionVersion: d.reflectionVersion ?? REFLECTION_VERSION,
  }));
  /**
   * An in-the-moment entry, saved on the tap rather than on the Save button.
   *
   * She may be logging this standing in a restaurant bathroom with half a
   * minute and one hand, so it must not depend on her scrolling to the bottom
   * of the page afterwards. The next state is computed here and posted
   * directly, because `file` in this closure would be a render behind.
   */
  const quickLog = async (number: number, patch: Partial<DateEntry>, phase: 'before' | 'during' = 'during', extra: Partial<HisFile> = {}) => {
    const now = new Date().toISOString();
    const next: HisFile = {
      ...file,
      ...extra,
      dates: datesOf(file).map(d => {
        if (d.number !== number) return d;
        // Before is stamped once, on the first save; during moves with every tap.
        const stamp = phase === 'before'
          ? { beforeLoggedAt: d.beforeLoggedAt ?? now, reflectionVersion: d.reflectionVersion ?? REFLECTION_VERSION }
          : { duringLoggedAt: now };
        return { ...d, ...patch, ...stamp };
      }),
    };
    setFile(next);
    if (isNew) return; // Nothing to attach it to until the file is saved once.
    setQuickSaving(number);
    try {
      const res = await fetch(`/api/hisfile/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (data.file) setFile(withFlagIds(data.file));
    } catch {
      // Keep her entry on screen. It saves with the rest of the form.
    } finally {
      setQuickSaving(null);
    }
  };

  const addDate = () => setFile(f => {
    const base = datesOf(f);
    return { ...f, dates: [...base, { number: base.length + 1 }] };
  });
  const removeLastDate = () => setFile(f => {
    const base = datesOf(f);
    return base.length > 1 ? { ...f, dates: base.slice(0, -1) } : f;
  });

  const addIck = (ick: string) => {
    const trimmed = ick.trim();
    if (!trimmed) return;
    if ((file.icks ?? []).some(i => ickText(i) === trimmed)) return;
    // Stamped with the date and the subject, so she can see after how many
    // dates the icks start and what they tend to be about.
    const entry: IckEntry = {
      text: trimmed,
      dateNumber: Number(ickDate || latestDate),
      ...(ickTopic ? { topic: ickTopic } : {}),
    };
    setFile(f => ({ ...f, icks: [...(f.icks ?? []), entry] }));
    setIckTopic('');
  };

  const removeIck = (ick: string) => {
    setFile(f => ({ ...f, icks: (f.icks ?? []).filter(i => ickText(i) !== ick) }));
  };
  type ListField = 'i_noticed' | 'dont_forget';
  const addTo = (field: ListField, text: string) =>
    setFile(f => ({ ...f, [field]: [...(f[field] ?? []).filter(x => x.toLowerCase() !== text.toLowerCase()), text] }));
  const removeFrom = (field: ListField, text: string) =>
    setFile(f => ({ ...f, [field]: (f[field] ?? []).filter(x => x !== text) }));

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

  // The card on its own: from the list page's "Before you see him", or the
  // reminder email. One screen, nothing else, a link to the full file.
  if (focus && !isNew) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--ivory)', padding: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <HighlightsCard file={file} focus />
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

        {!isNew && !isSafety && (
          <div style={{ marginBottom: 20 }}>
            <HighlightsCard file={file} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div className="v-eyebrow" style={{ marginBottom: 6 }}>
              {isNew ? 'New entry' : 'Edit entry'}
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px,5vw,42px)', fontWeight: 400, lineHeight: 1.05, color: 'var(--dark)', margin: 0, letterSpacing: -0.4 }}>
              {file.nickname || <em style={{ color: 'var(--mauve)' }}>Unnamed</em>}
            </h1>
            {!isSafety && file.star_sign && (
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

        {/* What kind of file this is, decides everything below it. */}
        <div style={{ marginBottom: 20 }}>
          <div className="v-eyebrow" style={{ marginBottom: 10 }}>Why you opened this file</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { type: 'dating' as FileType, label: 'Love interest' },
              { type: 'safety' as FileType, label: 'Safety check' },
            ]).map(o => (
              <button key={o.type} onClick={() => setFile(f => ({ ...f, file_type: o.type }))} style={{
                padding: '9px 20px', borderRadius: 'var(--r-pill)',
                border: fileType === o.type ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                background: fileType === o.type ? 'var(--primary-mist)' : 'var(--pearl)',
                color: fileType === o.type ? 'var(--primary-deep)' : 'var(--dark-soft)',
                fontFamily: 'var(--sans)', fontSize: 13,
                fontWeight: fileType === o.type ? 500 : 400, cursor: 'pointer',
              }}>
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', marginTop: 8, opacity: 0.8 }}>
            {isSafety
              ? 'Just the essentials, where you met, where you’re meeting, and your notes.'
              : 'The full questionnaire, how you met, first dates, icks and compatibility.'}
          </div>
        </div>

        {/* Compatibility, dating only, or a prompt if she hasn't set her DOB yet */}
        {isSafety ? null : hasDob === false ? (
          <Link href="/settings" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
            <div style={{
              padding: '16px 20px', borderRadius: 'var(--r-lg)',
              background: 'var(--blush-pale)', border: '1px solid var(--primary-pale)',
              display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>✦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--dark)', fontWeight: 400 }}>
                  Add your birthday to see compatibility.
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--dark-soft)', marginTop: 3, opacity: 0.75 }}>
                  We&rsquo;ll calculate how your star sign lines up with {file.nickname || 'this person'}.
                </div>
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--primary-deep)', fontWeight: 500, flexShrink: 0 }}>
                Settings →
              </div>
            </div>
          </Link>
        ) : file.compatibility_score !== undefined && file.compatibility_summary ? (
          <div style={{ padding: '20px 24px', borderRadius: 'var(--r-lg)', background: 'var(--pearl)', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
            <div className="v-eyebrow" style={{ marginBottom: 8 }}>Star sign compatibility</div>
            {compatBar(file.compatibility_score)}
            {file.compatibility_summary && (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.6, margin: '12px 0 0' }}>
                &ldquo;{file.compatibility_summary}&rdquo;
              </p>
            )}
          </div>
        ) : null}

        {/* Basics */}
        <Section eyebrow="01" title="Basics">
          <Field label="Nickname *">
            <input
              value={file.nickname}
              onChange={e => setFile(f => ({ ...f, nickname: e.target.value }))}
              placeholder={isSafety ? 'How you refer to him' : 'How you know him'}
              style={inputStyle}
            />
          </Field>
          <Field label="Status">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(isSafety ? STATUSES_SAFETY : STATUSES).map(s => (
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
            {isSafety ? (
              <Field label="Phone">
                <input value={file.phone ?? ''} onChange={e => setFile(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={inputStyle} />
              </Field>
            ) : (
              <Field label="Date of birth">
                <input type="date" value={file.date_of_birth ?? ''} onChange={e => setFile(f => ({ ...f, date_of_birth: e.target.value }))} style={inputStyle} />
              </Field>
            )}
          </TwoCol>
          {!isSafety && (
            <TwoCol>
              <Field label="Phone">
                <input value={file.phone ?? ''} onChange={e => setFile(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" style={inputStyle} />
              </Field>
              <Field label="His finsta / alt account">
                <input value={file.his_finsta ?? ''} onChange={e => setFile(f => ({ ...f, his_finsta: e.target.value }))} placeholder="@handle" style={inputStyle} />
              </Field>
            </TwoCol>
          )}
          <Field label="Notes">
            <textarea
              value={file.notes ?? ''}
              onChange={e => setFile(f => ({ ...f, notes: e.target.value }))}
              placeholder={isSafety
                ? 'What he’s selling, what he told you, anything that felt off...'
                : 'Anything important to remember...'}
              rows={isSafety ? 6 : 4}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </Field>
        </Section>

        {/* Meeting up, safety files only. No first date, no who-paid: this is
            a one-off handoff, and the only thing that matters is where. */}
        {isSafety && (
          <Section eyebrow="02" title="Meeting up">
            <Field label="Where you found him">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WHERE_MET_SAFETY.map(w => (
                  <button key={w} onClick={() => setFile(f => ({ ...f, where_we_met: w }))} style={{
                    padding: '7px 16px', borderRadius: 'var(--r-pill)',
                    border: file.where_we_met === w ? '1.5px solid var(--primary)' : '1.5px solid var(--gold-pale)',
                    background: file.where_we_met === w ? 'var(--primary-mist)' : 'var(--pearl)',
                    color: file.where_we_met === w ? 'var(--primary-deep)' : 'var(--dark-soft)',
                    fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer',
                  }}>
                    {w}
                  </button>
                ))}
              </div>
            </Field>
            <TwoCol>
              <Field label="Meet-up location">
                <input
                  value={file.meetup_location ?? ''}
                  onChange={e => setFile(f => ({ ...f, meetup_location: e.target.value }))}
                  placeholder="Address or place you agreed on"
                  style={inputStyle}
                />
              </Field>
              <Field label="Date">
                <input type="date" value={file.met_date ?? ''} onChange={e => setFile(f => ({ ...f, met_date: e.target.value }))} style={inputStyle} />
              </Field>
            </TwoCol>
          </Section>
        )}

        {/* How we met */}
        {!isSafety && (
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
        )}

        {/* Dates */}
        {!isSafety && (
        <Section eyebrow="03" title="Dates">
          {(() => {
            // A date still ahead of her is the one she will want to log from,
            // so say so at the top and point her at the one-tap row below.
            const today = new Date().toISOString().slice(0, 10);
            const soon = dates.find(d => d.date && d.date > today);
            if (!soon) return null;
            const when = new Date(`${soon.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            return (
              <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--primary-mist)', border: '1px solid var(--primary-pale)' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 15.5, color: 'var(--dark)', lineHeight: 1.5 }}>
                  Your {ordinal(soon.number).toLowerCase()} date{file.nickname ? ` with ${file.nickname}` : ''} is {when}{soon.location ? `, at ${soon.location}` : ''}.
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', lineHeight: 1.55, marginTop: 5 }}>
                  Before you go, tap how you feel under &ldquo;Before&rdquo;. While you are there, tap under &ldquo;During&rdquo;. Both save the moment you tap, no need to come back down here.
                </div>
              </div>
            );
          })()}
          {dates.map(d => (
            <div key={d.number} style={{ padding: '16px 18px', borderRadius: 'var(--r-md)', background: 'var(--ivory)', border: '1px solid var(--gold-pale)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 17, color: 'var(--dark)' }}>{ordinal(d.number)} date</span>
                {d.number === dates.length && d.number > 1 && (
                  <button onClick={removeLastDate} style={{ background: 'none', border: 'none', color: 'var(--mauve-deep)', fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                )}
              </div>
              <TwoCol>
                <Field label="Location">
                  <input value={d.location ?? ''} onChange={e => updateDate(d.number, { location: e.target.value })} placeholder="Restaurant, bar..." style={inputStyle} />
                </Field>
                <Field label="Date">
                  <input type="date" value={d.date ?? ''} onChange={e => updateDate(d.number, { date: e.target.value })} style={inputStyle} />
                </Field>
              </TwoCol>
              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                const passed = !!d.date && d.date < today;
                const isToday = d.date === today;
                const defaults = { before: !passed, during: isToday || !d.date, after: passed };
                const isOpen = (phase: Phase) => openPhases[phaseKey(d.number, phase)] ?? defaults[phase];
                const feelingLabel = (v?: Feeling) => FEELINGS.find(fe => fe.value === v)?.label;
                const beforeItems = REFLECTION_ITEMS_V1.before;
                const afterItems = REFLECTION_ITEMS_V1.after;
                const answered = (answers: Record<string, number> | undefined, items: readonly ReflectionItem[]) =>
                  items.filter(it => asAnswer(answers?.[it.id]) !== undefined).length;
                const setBefore = (id: string, value: number) =>
                  quickLog(d.number, { beforeAnswers: { ...(d.beforeAnswers ?? {}), [id]: value } }, 'before');
                const setAfter = (id: string, value: number) =>
                  updateAfter(d.number, { afterAnswers: { ...(d.afterAnswers ?? {}), [id]: value } });
                // One tap per flag, per stage. Before and During save on the
                // tap; After saves with the form. One of her own red flags,
                // tapped during, is also an ick on this date so the Icks
                // section and Wrapped see it; un-tapping removes only that ick.
                const toggleFlagIn = (phase: FlagPhase, fid: string) => {
                  const field = phase === 'before' ? 'beforeFlags' : phase === 'during' ? 'duringFlags' : 'afterFlags';
                  const cur = d[field] ?? [];
                  const has = cur.includes(fid);
                  const nextFlags = has ? cur.filter(x => x !== fid) : [...cur, fid];
                  if (phase === 'after') { updateAfter(d.number, { afterFlags: nextFlags }); return; }
                  let icks = file.icks ?? [];
                  const parsed = parseFlagId(fid);
                  if (phase === 'during' && parsed?.source === 'personal' && parsed.kind === 'red') {
                    const text = parsed.text;
                    const mine = (i: string | IckEntry) => typeof i !== 'string' && i.text === text && i.dateNumber === d.number;
                    if (has) icks = icks.filter(i => !mine(i));
                    else if (!icks.some(i => ickText(i) === text)) icks = [...icks, { text, dateNumber: d.number }];
                  }
                  quickLog(d.number, { [field]: nextFlags }, phase, phase === 'during' ? { icks } : {});
                };
                return (
                  <>
                    {/* BEFORE. One tap, saved on the tap. Open until the date has
                        passed, then folded to a line she can reopen. */}
                    <DatePhase
                      title="Before"
                      hint={passed ? undefined : 'Saves the moment you tap'}
                      status={quickSaving === d.number ? 'Saving...' : d.beforeLoggedAt ? `Logged ${stamp(d.beforeLoggedAt)}` : undefined}
                      summary={[moodLabels(d.beforeMoods), flagSummary(d.beforeFlags), answered(d.beforeAnswers, beforeItems) ? `${answered(d.beforeAnswers, beforeItems)} of ${beforeItems.length} answered` : null].filter(Boolean).join(' · ') || 'Not logged'}
                      open={isOpen('before')}
                      onToggle={() => togglePhase(d.number, 'before', defaults.before)}
                      tone="soft"
                    >
                      <MoodRow
                        value={d.beforeMoods ?? []}
                        onToggle={v => {
                          const cur = d.beforeMoods ?? [];
                          quickLog(d.number, { beforeMoods: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }, 'before');
                        }}
                      />
                      <input
                        value={d.beforeNote ?? ''}
                        onChange={e => updateDate(d.number, { beforeNote: e.target.value })}
                        onBlur={e => { if (e.target.value.trim()) quickLog(d.number, { beforeNote: e.target.value }, 'before'); }}
                        placeholder={(d.beforeMoods ?? []).includes('have-questions') ? 'What do you want to ask him?' : 'Questions to ask him, or anything on your mind...'}
                        style={{ ...inputStyle, background: 'var(--pearl)' }}
                      />
                      <FlagRows
                        chosen={d.beforeFlags ?? []}
                        onToggle={fid => toggleFlagIn('before', fid)}
                        personal={myFlags}
                        usage={flagUsage}
                        reportId={file.report_id}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {beforeItems.map(it => (
                          <AnswerSlider
                            key={it.id}
                            item={it}
                            value={asAnswer(d.beforeAnswers?.[it.id])}
                            onChange={v => updateDate(d.number, { beforeAnswers: { ...(d.beforeAnswers ?? {}), [it.id]: v } })}
                            onCommit={v => setBefore(it.id, v)}
                          />
                        ))}
                      </div>
                    </DatePhase>

                    {/* DURING. Unchanged: logged in the moment, saved on the tap. */}
                    <DatePhase
                      title="During"
                      hint="Saves the moment you tap"
                      status={quickSaving === d.number ? 'Saving...' : d.duringLoggedAt ? `Logged ${stamp(d.duringLoggedAt)}` : undefined}
                      summary={flagSummary(d.duringFlags) ?? feelingLabel(d.duringFeeling) ?? 'Not logged'}
                      open={isOpen('during')}
                      onToggle={() => togglePhase(d.number, 'during', defaults.during)}
                      tone="strong"
                    >
                      {d.beforeNote?.trim() && (
                        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--dark-soft)', lineHeight: 1.45 }}>
                          You wanted to ask: {d.beforeNote.trim()}
                        </div>
                      )}
                      <FlagRows
                        chosen={d.duringFlags ?? []}
                        onToggle={fid => toggleFlagIn('during', fid)}
                        personal={myFlags}
                        usage={flagUsage}
                        reportId={file.report_id}
                      />
                      {d.duringFeeling && (
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)' }}>
                          Felt: {feelingLabel(d.duringFeeling)}
                        </div>
                      )}
                      <input
                        value={d.duringNote ?? ''}
                        onChange={e => updateDate(d.number, { duringNote: e.target.value })}
                        onBlur={e => { if (e.target.value.trim()) quickLog(d.number, { duringNote: e.target.value }); }}
                        placeholder="One line, just for you..."
                        style={{ ...inputStyle, background: 'var(--pearl)' }}
                      />
                    </DatePhase>

                    {/* AFTER. Longer, saved with the form. */}
                    <DatePhase
                      title="After"
                      status={d.afterLoggedAt ? `Started ${stamp(d.afterLoggedAt)}` : undefined}
                      summary={[feelingLabel(d.feeling), flagSummary(d.afterFlags), d.paid ? `${d.paid}` : null, answered(d.afterAnswers, afterItems) ? `${answered(d.afterAnswers, afterItems)} of ${afterItems.length} answered` : null].filter(Boolean).join(' · ') || 'Not logged'}
                      open={isOpen('after')}
                      onToggle={() => togglePhase(d.number, 'after', defaults.after)}
                      tone="plain"
                    >
                      <Field label="How did you feel afterwards?">
                        <FeelingRow value={d.feeling} onPick={v => updateAfter(d.number, { feeling: v })} />
                      </Field>
                      <FlagRows
                        chosen={d.afterFlags ?? []}
                        onToggle={fid => toggleFlagIn('after', fid)}
                        personal={myFlags}
                        usage={flagUsage}
                        reportId={file.report_id}
                      />
                      <Field label="Who paid?">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['split', 'he paid', 'i paid', 'neither'] as const).map(opt => (
                            <button key={opt} onClick={() => updateAfter(d.number, { paid: opt })} style={chipStyle(d.paid === opt, false)}>{opt}</button>
                          ))}
                        </div>
                      </Field>
                      <Field label="What made you like him more?">
                        <textarea value={d.likedMore ?? ''} onChange={e => updateAfter(d.number, { likedMore: e.target.value })} placeholder="He listened, he planned it, he was kind to the waiter..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
                      </Field>
                      <Field label="What made you like him less?">
                        <textarea value={d.likedLess ?? ''} onChange={e => updateAfter(d.number, { likedLess: e.target.value })} placeholder="He was late, he talked about his ex..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
                      </Field>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {afterItems.map(it => (
                          <AnswerSlider
                            key={it.id}
                            item={it}
                            value={asAnswer(d.afterAnswers?.[it.id])}
                            onChange={v => setAfter(it.id, v)}
                          />
                        ))}
                      </div>
                    </DatePhase>
                  </>
                );
              })()}
            </div>
          ))}
          <button onClick={addDate} style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 'var(--r-pill)', border: '1.5px dashed var(--primary)', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--sans)', fontSize: 13, cursor: 'pointer' }}>
            + Add {ordinal(dates.length + 1).toLowerCase()} date
          </button>
        </Section>
        )}

        {/* Financial signals */}
        {!isSafety && (
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
        )}

        {/* The Ick */}
        {!isSafety && (
        <Section eyebrow="05" title="The Ick">
          {(() => {
            // A pattern, not a verdict: after how many dates the icks tend to
            // start, and what they are usually about.
            const stamped = (file.icks ?? []).filter((i): i is IckEntry => typeof i !== 'string');
            if (!stamped.length) return null;
            const firstAfter = Math.min(...stamped.map(i => i.dateNumber ?? Infinity));
            const topics: Record<string, number> = {};
            stamped.forEach(i => { if (i.topic) topics[i.topic] = (topics[i.topic] ?? 0) + 1; });
            const topTopic = Object.entries(topics).sort((x, y) => y[1] - x[1])[0]?.[0];
            return (
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--dark-soft)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--ivory)', borderRadius: 'var(--r-md)' }}>
                {Number.isFinite(firstAfter) ? `First ick after the ${ordinal(firstAfter).toLowerCase()} date.` : ''}
                {topTopic ? ` Most often about ${topTopic}.` : ''}
              </div>
            );
          })()}
          <TwoCol>
            <Field label="Noticed it after">
              <select value={ickDate || latestDate} onChange={e => setIckDate(Number(e.target.value))} style={inputStyle}>
                {dates.map(d => <option key={d.number} value={d.number}>{ordinal(d.number)} date</option>)}
              </select>
            </Field>
            <Field label="What was it about?">
              <select value={ickTopic} onChange={e => setIckTopic(e.target.value)} style={inputStyle}>
                <option value="">Choose one (optional)</option>
                {ICK_TOPICS.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            </Field>
          </TwoCol>
          <ChipListEditor
            items={(file.icks ?? []).map(ickText)}
            onAdd={addIck}
            onRemove={removeIck}
            suggestions={COMMON_ICKS}
            placeholder="Type an ick and press Enter"
            tone="red"
            meta={text => {
              const ick = (file.icks ?? []).find(i => ickText(i) === text);
              if (!ick || typeof ick === 'string') return '';
              return [ick.dateNumber ? `after date ${ick.dateNumber}` : '', ick.topic ?? ''].filter(Boolean).join(' · ');
            }}
          />
        </Section>
        )}

        {/* Her notes on him: what he loves, what she has noticed, what she
            must not forget. The Highlights card at the top reads from these. */}
        {!isSafety && (
        <Section eyebrow="06" title="He loves">
          <LovesTable
            items={file.he_loves ?? []}
            onChange={next => setFile(f => ({ ...f, he_loves: next }))}
            suggestions={HE_LOVES_SUGGESTIONS}
          />
        </Section>
        )}
        {!isSafety && (
        <Section eyebrow="07" title="I noticed">
          <ChipListEditor
            items={file.i_noticed ?? []}
            onAdd={t => addTo('i_noticed', t)}
            onRemove={t => removeFrom('i_noticed', t)}
            placeholder="Something you want on record..."
            tone="gold"
          />
        </Section>
        )}
        {!isSafety && (
        <Section eyebrow="08" title="Don't forget">
          <ChipListEditor
            items={file.dont_forget ?? []}
            onAdd={t => addTo('dont_forget', t)}
            onRemove={t => removeFrom('dont_forget', t)}
            suggestions={DONT_FORGET_SUGGESTIONS}
            placeholder="Before you see him again..."
            tone="rose"
          />
        </Section>
        )}

        {/* Milestones: the dates that matter, in her words. Inside Verity
            only; nothing here touches her real calendar. */}
        {!isSafety && (
        <Section eyebrow="09" title="Milestones">
          <MilestonesEditor
            milestones={file.milestones ?? []}
            dates={dates}
            firstDateDate={dates.find(d => d.number === 1)?.date}
            onChange={ms => setFile(f => ({ ...f, milestones: ms }))}
          />
        </Section>
        )}

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

type Phase = 'before' | 'during' | 'after';

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const moodLabels = (values?: string[]) =>
  (values ?? []).map(v => BEFORE_MOODS.find(m => m.value === v)?.label ?? v).join(', ') || undefined;

const flagSummary = (flags?: string[]) => {
  if (!flags?.length) return undefined;
  const kinds = flags.map(flagKind);
  const g = kinds.filter(k => k === 'green').length;
  const r = kinds.filter(k => k === 'red' || k === 'safety').length;
  return [g ? `${g} green` : null, r ? `${r} red` : null].filter(Boolean).join(' · ') || undefined;
};

/** Her file with every date's flag fields as ids, whatever shape they were stored in. */
const withFlagIds = (f: HisFile): HisFile => (f.dates ? { ...f, dates: f.dates.map(normalizeDateFlags) } : f);

/** Before she goes: several can be true at once, so these toggle. */
function MoodRow({ value, onToggle }: { value: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {BEFORE_MOODS.map(m => (
        <button key={m.value} onClick={() => onToggle(m.value)} style={{ ...chipStyle(value.includes(m.value), true), textTransform: 'none' }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** A feeling chip. `strong` is the filled look used where one tap is the whole job. */
function chipStyle(selected: boolean, strong: boolean): React.CSSProperties {
  return {
    padding: strong ? '10px 18px' : '7px 16px', borderRadius: 'var(--r-pill)',
    border: selected ? '1.5px solid var(--primary)' : strong ? '1.5px solid var(--primary-pale)' : '1.5px solid var(--gold-pale)',
    background: selected ? (strong ? 'var(--primary)' : 'var(--primary-mist)') : 'var(--pearl)',
    color: selected ? (strong ? 'var(--pearl)' : 'var(--primary-deep)') : 'var(--dark-soft)',
    fontFamily: 'var(--sans)', fontSize: strong ? 13.5 : 13, cursor: 'pointer', textTransform: 'capitalize',
  };
}

function FeelingRow({ value, onPick, strong = false }: { value?: Feeling; onPick: (v: Feeling) => void; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {FEELINGS.map(fe => (
        <button key={fe.value} onClick={() => onPick(fe.value)} style={{ ...chipStyle(value === fe.value, strong), textTransform: 'none' }}>
          {fe.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One of the three parts of a date card. Folded, it is a single line she can
 * read at a glance and tap to open; open, it holds the fields. Nothing about
 * folding changes what is saved.
 */
function DatePhase({ title, hint, status, summary, open, onToggle, tone, children }: {
  title: string;
  hint?: string;
  status?: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  tone: 'soft' | 'strong' | 'plain';
  children: React.ReactNode;
}) {
  const bg = tone === 'strong' ? 'var(--blush-pale)' : tone === 'soft' ? 'var(--primary-mist)' : 'var(--pearl)';
  const border = tone === 'plain' ? '1px solid var(--gold-pale)' : '1px solid var(--primary-pale)';
  return (
    <div style={{ borderRadius: 'var(--r-md)', background: bg, border }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 15px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 500, color: 'var(--primary-deep)', letterSpacing: 0.2, textTransform: 'uppercase' }}>{title}</span>
          {!open && <span style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)' }}>{status ?? (open ? hint : undefined)}</span>
          <span aria-hidden style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--mauve-deep)', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 120ms' }}>›</span>
        </span>
      </button>
      {open && <div style={{ padding: '0 15px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
    </div>
  );
}

/**
 * A 1 to 5 slider for one question. Optional: until she moves it, it reads
 * as unanswered and is not stored. `onChange` follows the thumb; `onCommit`,
 * when given, fires once when she lets go, for sections that save on the tap.
 */
function AnswerSlider({ item, value, onChange, onCommit }: {
  item: ReflectionItem;
  value?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
}) {
  const answered = value !== undefined;
  const shown = value ?? 3;
  const read = (e: { currentTarget: { value: string } }) => Number(e.currentTarget.value);
  return (
    <div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--dark)', lineHeight: 1.4, marginBottom: 6 }}>{item.prompt}</div>
      <input
        type="range" min={1} max={5} step={1}
        value={shown}
        aria-label={item.prompt}
        aria-valuetext={answered ? `${value} of 5` : 'not answered'}
        onChange={e => onChange(read(e))}
        onPointerUp={e => onCommit?.(read(e))}
        onKeyUp={e => onCommit?.(read(e))}
        style={{ width: '100%', accentColor: 'var(--primary)', opacity: answered ? 1 : 0.55, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--dark-soft)' }}>
        <span>1 · {item.low}</span>
        <span style={{ color: 'var(--mauve-deep)' }}>{answered ? value : 'slide to answer'}</span>
        <span>5 · {item.high}</span>
      </div>
    </div>
  );
}

/**
 * Add, list and remove milestones. Suggestions are shortcuts into the label
 * box, not a fixed list. Timeline is oldest first, with how long ago each was
 * and the gap from the one before.
 */
function MilestonesEditor({ milestones, dates, firstDateDate, onChange }: {
  milestones: Milestone[];
  dates: DateEntry[];
  firstDateDate?: string;
  onChange: (next: Milestone[]) => void;
}) {
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [dateNumber, setDateNumber] = useState<number | ''>('');

  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));
  const hasFirstDate = milestones.some(m => m.label.trim().toLowerCase() === 'first date');
  const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const add = () => {
    const l = label.trim().replace(/\s+/g, ' ');
    if (!l || !date) return;
    const m: Milestone = { id: newId(), label: l, date, ...(note.trim() ? { note: note.trim() } : {}), ...(dateNumber !== '' ? { dateNumber: Number(dateNumber) } : {}) };
    onChange([...milestones, m]);
    setLabel(''); setDate(''); setNote(''); setDateNumber('');
  };
  const remove = (id: string) => onChange(milestones.filter(m => m.id !== id));
  const addFirstDate = () => {
    if (!firstDateDate) return;
    onChange([...milestones, { id: newId(), label: 'First date', date: firstDateDate, dateNumber: 1 }]);
  };

  return (
    <>
      {firstDateDate && !hasFirstDate && (
        <div style={{ padding: '12px 15px', borderRadius: 'var(--r-md)', background: 'var(--primary-mist)', border: '1px solid var(--primary-pale)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--dark)' }}>
            Your first date was {new Date(`${firstDateDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Mark it?
          </span>
          <button onClick={addFirstDate} style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--sans)', fontSize: 12.5, cursor: 'pointer' }}>Add “First date”</button>
        </div>
      )}

      {sorted.length > 0 ? (
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: 'var(--gold-pale)' }} />
          {sorted.map((m, i) => {
            const prev = sorted[i - 1];
            return (
              <div key={m.id} style={{ position: 'relative', paddingBottom: i === sorted.length - 1 ? 0 : 18 }}>
                <div style={{ position: 'absolute', left: -20, top: 5, width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--pearl)' }} />
                {prev && (
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', marginBottom: 6 }}>{describeGap(daysBetween(prev.date, m.date))} later</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <div>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--dark)' }}>{m.label}</span>
                    {m.dateNumber ? <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--mauve-deep)', marginLeft: 8 }}>{ordinal(m.dateNumber)} date</span> : null}
                  </div>
                  <button onClick={() => remove(m.id)} aria-label={`Remove ${m.label}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mauve-deep)', fontSize: 14 }}>×</button>
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--dark-soft)', marginTop: 2 }}>
                  {new Date(`${m.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {describeSince(m.date)}
                </div>
                {m.note && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--dark-soft)', marginTop: 4, lineHeight: 1.45 }}>{m.note}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--dark-soft)', fontWeight: 300 }}>
          Nothing marked yet. The first kiss, the first time he cooked, the day you said it was exclusive: whatever mattered.
        </p>
      )}

      <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--ivory)', border: '1px solid var(--gold-pale)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MILESTONE_SUGGESTIONS.map(sg => (
            <button key={sg} onClick={() => setLabel(sg)} style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', border: '1px solid var(--gold-pale)', background: label === sg ? 'var(--primary-mist)' : 'var(--pearl)', color: label === sg ? 'var(--primary-deep)' : 'var(--dark-soft)', fontFamily: 'var(--sans)', fontSize: 12, cursor: 'pointer' }}>{sg}</button>
          ))}
        </div>
        <TwoCol>
          <Field label="What happened">
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="In your words..." maxLength={80} style={inputStyle} />
          </Field>
          <Field label="When">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </Field>
        </TwoCol>
        <TwoCol>
          <Field label="Note (optional)">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Anything you want to remember" maxLength={280} style={inputStyle} />
          </Field>
          <Field label="Which date? (optional)">
            <select value={dateNumber} onChange={e => setDateNumber(e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle}>
              <option value="">Not tied to a date</option>
              {dates.map(d => <option key={d.number} value={d.number}>{ordinal(d.number)} date</option>)}
            </select>
          </Field>
        </TwoCol>
        <button onClick={add} disabled={!label.trim() || !date} style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 'var(--r-pill)', border: 'none', background: label.trim() && date ? 'var(--primary)' : 'var(--mauve)', color: 'var(--ivory)', fontFamily: 'var(--sans)', fontSize: 13, cursor: label.trim() && date ? 'pointer' : 'not-allowed' }}>
          Add milestone
        </button>
      </div>
    </>
  );
}
