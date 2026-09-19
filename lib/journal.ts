/**
 * The dating journal's shapes, kept free of server imports so the His File page
 * (a client component) and lib/hisfile.ts (server) can both use them.
 */

export type Feeling = 'loved it' | 'good' | 'unsure' | 'off' | 'bad';

export interface DateEntry {
  /** 1-based. Date 1 is mirrored into the first_date_* columns. */
  number: number;
  date?: string;
  location?: string;
  paid?: string;
  /**
   * Before she goes. Logged while the date is still ahead of her, one tap.
   * Moods are values from BEFORE_MOODS in lib/flags.ts; several can be true
   * at once. `beforeLoggedAt` is stamped on the first save and never moved.
   */
  beforeMoods?: string[];
  beforeNote?: string;
  beforeLoggedAt?: string;
  /**
   * Flags she tagged at each stage, as flag ids (lib/signals.ts): her own
   * personal flags and Verity signals. Rows saved before ids existed hold
   * `{ text, kind, at }` objects in duringFlags; read them through
   * normalizeFlagIds, which maps them to her personal flags.
   */
  beforeFlags?: string[];
  duringFlags?: string[];
  afterFlags?: string[];
  /**
   * Her answers to the before and after questions, 1 to 5, keyed by item id
   * from lib/reflection.ts. Optional; a date with none is still a date.
   */
  beforeAnswers?: Record<string, number>;
  afterAnswers?: Record<string, number>;
  /** Which REFLECTION_ITEMS version the answer ids belong to. */
  reflectionVersion?: number;
  /** When the after section was first filled in. */
  afterLoggedAt?: string;
  /** How she felt afterwards. */
  feeling?: Feeling;
  /**
   * How she felt during the date itself, logged in the moment rather than
   * recalled later. Deliberately separate from `feeling`: the two often
   * disagree, and the gap between them is the useful part.
   */
  duringFeeling?: Feeling;
  duringNote?: string;
  /** When the in-the-moment entry was saved, so "during" is provably during. */
  duringLoggedAt?: string;
  likedMore?: string;
  likedLess?: string;
}

/**
 * A date that matters, in her words. Lives inside Verity only; nothing here
 * writes to her real calendar.
 */
export interface Milestone {
  id: string;
  /** Her words: "First date", "Met his sister". */
  label: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  note?: string;
  /** Optional link to a DateEntry by its number. */
  dateNumber?: number;
}

/** The shape duringFlags held before flag ids. Kept for reading old rows. */
export interface LegacyDuringFlag {
  text: string;
  kind: 'green' | 'red';
  at: string;
}

export interface IckEntry {
  text: string;
  /** The date she noticed it after. Absent on icks logged before dates were tracked. */
  dateNumber?: number;
  /** What it was about, so patterns across men become visible. */
  topic?: string;
}

/**
 * One thing he loves, as a label and what it is: "His coffee order" and
 * "black", "His team" and "Arsenal". Entries saved as plain strings before
 * the value column existed still read; `lovesText` shows either.
 */
export interface LovesEntry {
  label: string;
  value?: string;
}

export function lovesText(e: string | LovesEntry): string {
  if (typeof e === 'string') return e;
  return e.value?.trim() ? `${e.label}: ${e.value.trim()}` : e.label;
}

export function lovesLabel(e: string | LovesEntry): string {
  return typeof e === 'string' ? e : e.label;
}

/** Icks saved before the journal existed are plain strings; newer ones are entries. */
export function ickText(i: string | IckEntry): string {
  return typeof i === 'string' ? i : i.text;
}
