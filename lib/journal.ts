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
   * `beforeLoggedAt` is stamped on the first save and never moved.
   */
  beforeFeeling?: Feeling;
  beforeNote?: string;
  beforeLoggedAt?: string;
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

export interface IckEntry {
  text: string;
  /** The date she noticed it after. Absent on icks logged before dates were tracked. */
  dateNumber?: number;
  /** What it was about, so patterns across men become visible. */
  topic?: string;
}

/** Icks saved before the journal existed are plain strings; newer ones are entries. */
export function ickText(i: string | IckEntry): string {
  return typeof i === 'string' ? i : i.text;
}
