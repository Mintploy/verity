/**
 * Reads across all of her dating files and hands the Patterns page plain
 * facts about her own entries. Pure functions, no server imports, so the
 * page computes on what /api/hisfile already returns.
 *
 * Nothing here assigns her a category. The two rolling measures come from
 * her own slider answers (lib/reflection.ts) and are handed back as a band
 * (low / moderate / high) with the answers that moved it, never as a number
 * she is asked to interpret and never as a label for her. The page copy
 * follows the same rule: behaviour, described; no test, no diagnosis.
 */

import type { HisFile } from './hisfile';
import { ickText, type DateEntry, type Feeling } from './journal';
import { REFLECTION_ITEMS_V1, REFLECTION_VERSION, asAnswer, type ReflectionDimension, type ReflectionItem } from './reflection';

export const PATTERNS_MIN_DATES = 4;
export const PATTERNS_MIN_MEN = 2;
export const ROLLING_WINDOW = 10;

/** Statuses that mean it ended, for "how many dates before she stops logging". */
const ENDED_STATUSES = new Set(['ghosted', 'blocked', 'archived']);
/** With no ended status, a man whose last date is this old counts as stopped. */
const STOPPED_AFTER_DAYS = 60;

const FEELING_VALUE: Record<Feeling, number> = { 'loved it': 5, good: 4, unsure: 3, off: 2, bad: 1 };
export const FEELING_LABEL: Record<Feeling, string> = {
  'loved it': 'Loved it', good: 'Good', unsure: 'Not sure', off: 'Something felt off', bad: 'Bad',
};
const FEELINGS_BY_VALUE: Feeling[] = ['bad', 'off', 'unsure', 'good', 'loved it'];

/** Before-date moods grouped by where they sit. Everything else is neutral. */
const MOODS_UP = new Set(['excited', 'hopeful', 'curious']);
const MOODS_DOWN = new Set(['not-feeling-it', 'dont-want-to-go']);

export type Band = 'low' | 'moderate' | 'high';

export interface LoggedDate {
  fileId: string;
  who: string;
  status?: string;
  metVia: string;
  entry: DateEntry;
  /** ISO date, or '' when she never dated it. Sorts first, so it leaves the window first. */
  sortKey: string;
}

function datesOf(f: HisFile): DateEntry[] {
  if (f.dates?.length) return f.dates;
  const legacy: DateEntry = { number: 1, date: f.first_date_date, location: f.first_date_location, paid: f.first_date_paid };
  return legacy.date || legacy.location || legacy.paid ? [legacy] : [];
}

function nameOf(f: HisFile): string {
  return f.nickname || f.full_name || 'Unnamed';
}

function metVia(f: HisFile): string {
  return (f.met_on_app || f.where_we_met || '').trim() || 'Not recorded';
}

function hasAnswers(r?: Record<string, number>): boolean {
  return !!r && Object.values(r).some(v => asAnswer(v) !== undefined);
}

/** A date counts as completed once she has filled in the After section. */
export function isCompleted(d: DateEntry): boolean {
  return !!d.feeling || !!d.afterLoggedAt || hasAnswers(d.afterAnswers);
}

function daysSince(iso: string, today: Date): number {
  const d = new Date(`${iso}T00:00:00`).getTime();
  if (!Number.isFinite(d)) return 0;
  return Math.round((today.getTime() - d) / 86400000);
}

/** Every date from every dating file, oldest first. `completedOnly` keeps those with an After. */
export function collectDates(files: HisFile[], completedOnly = true): LoggedDate[] {
  const out: LoggedDate[] = [];
  for (const f of files) {
    if ((f.file_type ?? 'dating') !== 'dating' || !f.id) continue;
    for (const entry of datesOf(f)) {
      if (completedOnly && !isCompleted(entry)) continue;
      out.push({ fileId: f.id, who: nameOf(f), status: f.status, metVia: metVia(f), entry, sortKey: entry.date ?? '' });
    }
  }
  return out.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.who.localeCompare(b.who) || a.entry.number - b.entry.number);
}

export interface Readiness {
  ready: boolean;
  dates: number;
  men: number;
  needDates: number;
  needMen: number;
}

export function readiness(files: HisFile[]): Readiness {
  const done = collectDates(files);
  const men = new Set(done.map(d => d.fileId)).size;
  return {
    ready: done.length >= PATTERNS_MIN_DATES && men >= PATTERNS_MIN_MEN,
    dates: done.length,
    men,
    needDates: Math.max(0, PATTERNS_MIN_DATES - done.length),
    needMen: Math.max(0, PATTERNS_MIN_MEN - men),
  };
}

/* ------------------------------------------------------------------ */
/* Section 1: what the dates say                                       */
/* ------------------------------------------------------------------ */

export interface ByMet { where: string; feeling: Feeling; count: number; men: number; avg: number }
export interface IckPattern { text: string; men: number; times: number; typicalDate: number | null }
export interface DropSummary {
  /** Dates where she logged both a before mood and an after feeling. */
  compared: number;
  /** Of those, how many started up and ended unsure or worse. */
  drops: number;
  withWhom: Array<{ who: string; fileId: string; drops: number; of: number }>;
}
export interface StopsSummary { average: number | null; men: number; stillOpen: Array<{ who: string; fileId: string; dates: number; status?: string }> }
export interface PaidSummary { total: number; split: Array<{ who: string; count: number }> }

export interface DatesSay {
  byMet: ByMet[];
  icks: IckPattern[];
  drops: DropSummary;
  stops: StopsSummary;
  paid: PaidSummary;
}

function nearestFeeling(avg: number): Feeling {
  const idx = Math.min(4, Math.max(0, Math.round(avg) - 1));
  return FEELINGS_BY_VALUE[idx];
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function whatTheDatesSay(files: HisFile[], today: Date = new Date()): DatesSay {
  const dating = files.filter(f => (f.file_type ?? 'dating') === 'dating' && f.id);
  const done = collectDates(dating);

  // Average afterwards feeling by where she met him.
  const metGroups = new Map<string, { sum: number; n: number; men: Set<string> }>();
  for (const d of done) {
    if (!d.entry.feeling) continue;
    const g = metGroups.get(d.metVia) ?? { sum: 0, n: 0, men: new Set<string>() };
    g.sum += FEELING_VALUE[d.entry.feeling]; g.n += 1; g.men.add(d.fileId);
    metGroups.set(d.metVia, g);
  }
  const byMet: ByMet[] = [...metGroups.entries()]
    .map(([where, g]) => ({ where, avg: g.sum / g.n, feeling: nearestFeeling(g.sum / g.n), count: g.n, men: g.men.size }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);

  // Her most common icks, and how many dates in they usually appear.
  const ickMap = new Map<string, { text: string; men: Set<string>; times: number; at: number[] }>();
  for (const f of dating) {
    for (const i of f.icks ?? []) {
      const text = ickText(i).trim();
      if (!text) continue;
      const key = text.toLowerCase();
      const g = ickMap.get(key) ?? { text, men: new Set<string>(), times: 0, at: [] };
      g.men.add(f.id!); g.times += 1;
      if (typeof i !== 'string' && typeof i.dateNumber === 'number') g.at.push(i.dateNumber);
      ickMap.set(key, g);
    }
  }
  const icks: IckPattern[] = [...ickMap.values()]
    .map(g => ({ text: g.text, men: g.men.size, times: g.times, typicalDate: median(g.at) }))
    .sort((a, b) => b.men - a.men || b.times - a.times || a.text.localeCompare(b.text))
    .slice(0, 5);

  // How often her before feeling drops by the after feeling, and with whom.
  const dropMen = new Map<string, { who: string; drops: number; of: number }>();
  let compared = 0, drops = 0;
  for (const d of done) {
    const moods = d.entry.beforeMoods ?? [];
    if (!moods.length || !d.entry.feeling) continue;
    const up = moods.some(m => MOODS_UP.has(m)) && !moods.some(m => MOODS_DOWN.has(m));
    if (!up) continue;
    compared += 1;
    const dropped = FEELING_VALUE[d.entry.feeling] <= FEELING_VALUE.unsure;
    const g = dropMen.get(d.fileId) ?? { who: d.who, drops: 0, of: 0 };
    g.of += 1; if (dropped) { g.drops += 1; drops += 1; }
    dropMen.set(d.fileId, g);
  }
  const withWhom = [...dropMen.entries()]
    .map(([fileId, g]) => ({ fileId, ...g }))
    .filter(g => g.drops > 0)
    .sort((a, b) => b.drops - a.drops || a.who.localeCompare(b.who));

  // Average number of dates before she stops logging.
  const counts: number[] = [];
  const stillOpen: StopsSummary['stillOpen'] = [];
  for (const f of dating) {
    const all = datesOf(f);
    if (!all.length) continue;
    const dated = all.filter(d => d.date).map(d => d.date!).sort();
    const last = dated[dated.length - 1];
    const ended = ENDED_STATUSES.has(f.status ?? '');
    const quiet = !!last && daysSince(last, today) >= STOPPED_AFTER_DAYS;
    if (!ended && !quiet) continue;
    counts.push(all.length);
    if (!ended) stillOpen.push({ who: nameOf(f), fileId: f.id!, dates: all.length, status: f.status });
  }
  const stops: StopsSummary = {
    average: counts.length ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10 : null,
    men: counts.length,
    stillOpen,
  };

  // Who paid, across all first dates.
  const paidMap = new Map<string, number>();
  let paidTotal = 0;
  for (const f of dating) {
    const first = datesOf(f).find(d => d.number === 1) ?? datesOf(f)[0];
    const who = (first?.paid ?? f.first_date_paid ?? '').trim().toLowerCase();
    if (!who) continue;
    paidTotal += 1;
    paidMap.set(who, (paidMap.get(who) ?? 0) + 1);
  }
  const paid: PaidSummary = {
    total: paidTotal,
    split: [...paidMap.entries()].map(([who, count]) => ({ who, count })).sort((a, b) => b.count - a.count),
  };

  return { byMet, icks, drops: { compared, drops, withWhom }, stops, paid };
}

/* ------------------------------------------------------------------ */
/* Section 2: her own answers, summarised back                         */
/* ------------------------------------------------------------------ */

export interface Mover {
  prompt: string;
  /** Her answer in the slider's own words: "immediately", "closer to no rush". */
  answer: string;
  value: number;
  who: string;
  fileId: string;
  date?: string;
  dateNumber: number;
}

export interface ManBand { who: string; fileId: string; band: Band; dates: number }

export interface DimensionRead {
  dimension: ReflectionDimension;
  band: Band | null;
  /** Dates in the window that carried at least one answer for this dimension. */
  dates: number;
  average: number | null;
  movers: Mover[];
  perMan: ManBand[];
  /** True when at least two men have a band and they differ. */
  differsByMan: boolean;
  /** True when the band is high for more than half of the men who have one (two or more). */
  highWithMost: boolean;
}

export interface YourPatterns {
  window: number;
  anxiety: DimensionRead;
  avoidance: DimensionRead;
  /** Reply-urgency after dates that went well versus the rest, when both sides exist. */
  replyAfterGoodDates: 'faster' | 'slower' | 'same' | null;
  /** Offered once, quietly, when either band is high with most men. */
  suggestTalkingItThrough: boolean;
}

const ALL_ITEMS: ReflectionItem[] = [...REFLECTION_ITEMS_V1.before, ...REFLECTION_ITEMS_V1.after];

interface Answer { item: ReflectionItem; value: number; date: LoggedDate }

/** Her V1 answers on one date, flipped where the item says so. */
function answersOn(d: LoggedDate): Answer[] {
  const v = d.entry.reflectionVersion;
  if (v !== undefined && v !== REFLECTION_VERSION) return [];
  const out: Answer[] = [];
  for (const item of ALL_ITEMS) {
    const bag = REFLECTION_ITEMS_V1.before.includes(item) ? d.entry.beforeAnswers : d.entry.afterAnswers;
    const raw = asAnswer(bag?.[item.id]);
    if (raw === undefined) continue;
    out.push({ item, value: item.reverse ? 6 - raw : raw, date: d });
  }
  return out;
}

export function bandOf(avg: number): Band {
  if (avg < 2.34) return 'low';
  if (avg < 3.67) return 'moderate';
  return 'high';
}

/** Her answer in the slider's own end labels, so the quote is in her words. */
export function answerWords(item: ReflectionItem, value: number): string {
  if (value === 1) return item.low;
  if (value === 5) return item.high;
  if (value === 2) return `closer to ${item.low}`;
  if (value === 4) return `closer to ${item.high}`;
  return `between ${item.low} and ${item.high}`;
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }

function readDimension(dimension: ReflectionDimension, window: LoggedDate[]): DimensionRead {
  const perDate = window
    .map(d => ({ d, answers: answersOn(d).filter(a => a.item.dimension === dimension) }))
    .filter(x => x.answers.length > 0);
  if (!perDate.length) {
    return { dimension, band: null, dates: 0, average: null, movers: [], perMan: [], differsByMan: false, highWithMost: false };
  }
  const average = mean(perDate.map(x => mean(x.answers.map(a => a.value))));
  const band = bandOf(average);

  const all = perDate.flatMap(x => x.answers);
  const pull = (a: Answer) => band === 'high' ? a.value : band === 'low' ? 6 - a.value : Math.abs(a.value - 3);
  const movers: Mover[] = [...all]
    .sort((a, b) => pull(b) - pull(a) || b.date.sortKey.localeCompare(a.date.sortKey))
    .slice(0, 2)
    .map(a => ({
      prompt: a.item.prompt,
      answer: answerWords(a.item, a.item.reverse ? 6 - a.value : a.value),
      value: a.value,
      who: a.date.who,
      fileId: a.date.fileId,
      date: a.date.entry.date,
      dateNumber: a.date.entry.number,
    }));

  const byMan = new Map<string, { who: string; means: number[] }>();
  for (const x of perDate) {
    const g = byMan.get(x.d.fileId) ?? { who: x.d.who, means: [] };
    g.means.push(mean(x.answers.map(a => a.value)));
    byMan.set(x.d.fileId, g);
  }
  const perMan: ManBand[] = [...byMan.entries()]
    .filter(([, g]) => g.means.length >= 1)
    .map(([fileId, g]) => ({ fileId, who: g.who, band: bandOf(mean(g.means)), dates: g.means.length }))
    .sort((a, b) => b.dates - a.dates || a.who.localeCompare(b.who));
  const banded = perMan.filter(m => m.dates >= 2);
  const differsByMan = banded.length >= 2 && new Set(banded.map(m => m.band)).size > 1;
  const highWithMost = banded.length >= 2 && banded.filter(m => m.band === 'high').length * 2 > banded.length;

  return { dimension, band, dates: perDate.length, average, movers, perMan, differsByMan, highWithMost };
}

export function yourPatterns(files: HisFile[]): YourPatterns {
  const answered = collectDates(files, false).filter(d => answersOn(d).length > 0);
  const window = answered.slice(-ROLLING_WINDOW);
  const anxiety = readDimension('anxiety', window);
  const avoidance = readDimension('avoidance', window);

  // Reply urgency (after-date items a1, a2) after dates that went well versus the rest.
  const urgency = (d: LoggedDate) => {
    const xs = answersOn(d).filter(a => a.item.dimension === 'anxiety' && (a.item.id === 'a1' || a.item.id === 'a2')).map(a => a.value);
    return xs.length ? mean(xs) : null;
  };
  const good: number[] = [], rest: number[] = [];
  for (const d of window) {
    const u = urgency(d);
    if (u === null || !d.entry.feeling) continue;
    (FEELING_VALUE[d.entry.feeling] >= FEELING_VALUE.good ? good : rest).push(u);
  }
  let replyAfterGoodDates: YourPatterns['replyAfterGoodDates'] = null;
  if (good.length >= 2 && rest.length >= 2) {
    const diff = mean(good) - mean(rest);
    replyAfterGoodDates = diff >= 0.75 ? 'faster' : diff <= -0.75 ? 'slower' : 'same';
  }

  return {
    window: window.length,
    anxiety,
    avoidance,
    replyAfterGoodDates,
    suggestTalkingItThrough: anxiety.highWithMost || avoidance.highWithMost,
  };
}

/* ------------------------------------------------------------------ */
/* Section 3: what to try next, from her data only                     */
/* ------------------------------------------------------------------ */

export interface Suggestion { text: string; fileId?: string }

export function whatToTryNext(say: DatesSay, you: YourPatterns, redFlags: readonly string[] = []): Suggestion[] {
  const out: Suggestion[] = [];
  const has = (s: string) => redFlags.some(r => r.toLowerCase() === s.toLowerCase());

  // A man whose dates keep starting up and ending down.
  const drop = say.drops.withWhom.find(w => w.drops >= 2 && w.drops * 2 >= w.of);
  if (drop) {
    out.push({
      fileId: drop.fileId,
      text: `Before seeing ${drop.who} you have logged feeling up, and afterwards unsure or worse, on ${drop.drops} of ${drop.of} dates. Before the next one, write one line under Before about what would make it a good night, then read it back after.`,
    });
  }

  // An ick that keeps arriving, with more than one man.
  const ick = say.icks.find(i => i.men >= 2);
  if (ick && out.length < 2) {
    const when = ick.typicalDate ? `, usually by date ${ick.typicalDate}` : '';
    out.push({
      text: has(ick.text)
        ? `"${ick.text}" has come up with ${ick.men} men${when}. It is already one of your red flags: tap it during the date, while it is happening, rather than logging it after.`
        : `"${ick.text}" has come up with ${ick.men} men${when}. Add it to your red flags in Settings so it is one tap during the date.`,
    });
  }

  // Reply urgency, tied to the man and date it was strongest with.
  const anx = you.anxiety;
  if (anx.band === 'high' && anx.movers[0] && out.length < 2) {
    const m = anx.movers[0];
    out.push({
      fileId: m.fileId,
      text: `Wanting his reply weighed most after date ${m.dateNumber} with ${m.who}. Next time, log under Before how long you would be fine not hearing from him, and check it against what you actually did.`,
    });
  }

  // Holding back, tied to the man and date it was strongest with.
  const avo = you.avoidance;
  if (avo.band === 'high' && avo.movers[0] && out.length < 2) {
    const m = avo.movers[0];
    out.push({
      fileId: m.fileId,
      text: `You held back most on date ${m.dateNumber} with ${m.who}. On the next date, pick one real thing to let him see in the first half hour, and log afterwards whether you did.`,
    });
  }

  // Where she meets men has been making a difference.
  if (out.length < 2 && say.byMet.length >= 2) {
    const best = say.byMet[0], worst = say.byMet[say.byMet.length - 1];
    if (best.count >= 2 && worst.count >= 2 && best.avg - worst.avg >= 1.5) {
      out.push({
        text: `Dates with men you met on ${best.where} have felt "${FEELING_LABEL[best.feeling]}" on average; on ${worst.where}, "${FEELING_LABEL[worst.feeling]}". Worth weighting where you spend your time.`,
      });
    }
  }

  // Files that went quiet without a status.
  if (out.length < 2 && say.stops.stillOpen.length) {
    const s = say.stops.stillOpen[0];
    out.push({
      fileId: s.fileId,
      text: `${s.who}'s file has been quiet since date ${s.dates} but still says "${s.status || 'talking'}". Mark what happened, and this page can tell an ending from a quiet few weeks.`,
    });
  }

  return out.slice(0, 2);
}
