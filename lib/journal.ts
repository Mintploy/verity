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
  /** How she felt afterwards. */
  feeling?: Feeling;
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
