/**
 * The one-tap vocabulary around a date.
 *
 * Before she goes: how she feels about going. During: what she is noticing,
 * as green and red flags. The flag lists are seeded from what she told us
 * matters to her (user_profiles.green_flags / red_flags, set in Settings next
 * to her birthday) and topped up with these defaults, so the chips are hers
 * first and ours second.
 *
 * Plain words only. Nothing here is a test or a score.
 */

export const BEFORE_MOODS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'excited', label: 'Excited' },
  { value: 'curious', label: 'Curious' },
  { value: 'nervous', label: 'Nervous' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'not-feeling-it', label: 'Not really feeling it' },
  { value: 'dont-want-to-go', label: "I don't really want to go" },
  { value: 'have-questions', label: 'I have questions for him' },
];

export const DEFAULT_GREEN_FLAGS: readonly string[] = [
  'Asks about me',
  'Kind to the staff',
  'Makes me laugh',
  'Enjoying his conversation',
  'Actually listens',
  'Planned this well',
];

export const DEFAULT_RED_FLAGS: readonly string[] = [
  'Talks too much',
  'Talked about his ex',
  'On his phone',
  'Interrupts me',
  "He's annoying",
  'Rude to the staff',
  'Something feels off',
];

/**
 * Her personal standards: what she wants in a man and what she will not
 * accept. Asked once at sign-up and editable in Settings. Stored encrypted
 * on user_profiles.personal_flags under her data key. These are hers alone
 * and are kept apart from anything a lookup or a report says about him.
 */
export interface PersonalFlags {
  green: string[];
  red: string[];
  version: 1;
}

export const PERSONAL_FLAGS_VERSION = 1;
/** Up to five picks plus one of her own, per group. */
export const PERSONAL_FLAG_MAX_PICKS = 5;
export const PERSONAL_FLAG_MAX_CUSTOM = 1;
export const PERSONAL_FLAG_MAX = PERSONAL_FLAG_MAX_PICKS + PERSONAL_FLAG_MAX_CUSTOM;

export const PERSONAL_GREEN_EXAMPLES: readonly string[] = [
  'Plans the date', 'Asks about my life', 'Consistent texter', 'Kind to staff',
  'Introduces me to friends', 'Clear about what he wants', 'Financially stable', 'Follows through',
];

export const PERSONAL_RED_EXAMPLES: readonly string[] = [
  'Late without telling me', 'Rude to staff', 'Only talks about himself', 'Heavy drinking',
  'Pushes physical pace', 'Vague about what he wants', 'Flaky plans', 'Disrespects boundaries',
];

export function cleanPersonalFlags(v: unknown): PersonalFlags {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    green: cleanFlagList(o.green).slice(0, PERSONAL_FLAG_MAX),
    red: cleanFlagList(o.red).slice(0, PERSONAL_FLAG_MAX),
    version: PERSONAL_FLAGS_VERSION,
  };
}

export const FLAG_MAX_ITEMS = 20;
export const FLAG_MAX_LENGTH = 40;

/** A member-supplied flag list, cleaned: strings only, trimmed, deduped, capped. */
export function cleanFlagList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const t = item.trim().replace(/\s+/g, ' ').slice(0, FLAG_MAX_LENGTH);
    if (!t || out.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
    if (out.length >= FLAG_MAX_ITEMS) break;
  }
  return out;
}

/** Her own flags first, then defaults she has not already written herself. */
export function mergeFlags(own: readonly string[] | undefined, defaults: readonly string[]): string[] {
  const seen = new Set((own ?? []).map((x) => x.toLowerCase()));
  return [...(own ?? []), ...defaults.filter((d) => !seen.has(d.toLowerCase()))];
}
