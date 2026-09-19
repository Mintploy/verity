/**
 * The flags she can tag on a date, before, during and after. Two sources:
 *
 *   1. Her personal flags (user_profiles.personal_flags, lib/flags.ts):
 *      her own standards, green and red, in her words.
 *   2. Verity signals, the fixed library below, versioned. Each names the
 *      report section that can answer it, when there is one.
 *
 * A date stores flag ids (DateEntry.beforeFlags / duringFlags / afterFlags,
 * lib/journal.ts), inside the dates array, which is encrypted as a whole.
 * Ids are namespaced so the two sources never collide:
 *
 *   sig:<signal id>        a Verity signal, e.g. sig:story_mismatch
 *   me:green:<her words>   one of her green flags
 *   me:red:<her words>     one of her red flags
 *
 * Her words are kept in the id on purpose: a flag she tapped last spring
 * still reads as what she tapped, even if she rewords her list later.
 *
 * Client-safe: no server imports.
 */

import type { DateEntry } from './journal';

export type SignalTier = 'strong' | 'weak' | 'safety' | 'green';

export type ReportSection =
  | 'address_history' | 'property' | 'identity' | 'employment'
  | 'bankruptcies' | 'liens' | 'judgments' | 'phone_line_type';

export const SECTION_LABEL: Record<ReportSection, string> = {
  address_history: 'address history',
  property: 'property records',
  identity: 'identity',
  employment: 'employment',
  bankruptcies: 'bankruptcies',
  liens: 'liens',
  judgments: 'judgments',
  phone_line_type: 'phone line type',
};

export interface Signal {
  id: string;
  label: string;
  tier: SignalTier;
  /** Report sections that can answer it. Empty when nothing can, on its own. */
  answeredBy: readonly ReportSection[];
}

export const SIGNALS_VERSION = 1;

export const SIGNALS_V1: readonly Signal[] = [
  { id: 'story_mismatch', label: "His story doesn't add up (where he lives)", tier: 'strong', answeredBy: ['address_history', 'property'] },
  { id: 'no_last_name', label: "Won't confirm his last name or workplace", tier: 'strong', answeredBy: ['identity', 'employment'] },
  { id: 'money', label: 'Money red flag (asked for money, forgot wallet, odd job story)', tier: 'strong', answeredBy: ['bankruptcies', 'liens', 'judgments', 'employment'] },
  { id: 'off_app_fast', label: 'Pushing to move off the app fast', tier: 'strong', answeredBy: ['phone_line_type', 'identity'] },
  { id: 'no_footprint', label: "Can't find him online", tier: 'strong', answeredBy: ['identity', 'phone_line_type'] },
  { id: 'dodges', label: 'Avoids direct questions', tier: 'weak', answeredBy: [] },
  { id: 'too_fast', label: 'Too intense, too fast', tier: 'weak', answeredBy: [] },
  { id: 'ex_talk', label: 'Talked a lot about his ex', tier: 'weak', answeredBy: [] },
  { id: 'feels_off', label: 'Something feels off', tier: 'weak', answeredBy: [] },
  { id: 'unsafe', label: 'He made me feel unsafe', tier: 'safety', answeredBy: [] },
  { id: 'consistent_story', label: 'His story stays consistent', tier: 'green', answeredBy: ['address_history', 'identity'] },
  { id: 'verified_identity', label: 'Shared his last name and it checked out', tier: 'green', answeredBy: ['identity', 'employment'] },
  { id: 'introduced_friends', label: 'Introduced me to his friends', tier: 'green', answeredBy: [] },
];

export const SIGNALS = SIGNALS_V1;

/* ------------------------------------------------------------------ */
/* Flag ids                                                            */
/* ------------------------------------------------------------------ */

export type FlagKind = 'green' | 'red' | 'safety';

export const SIGNAL_PREFIX = 'sig:';
export const PERSONAL_PREFIX = 'me:';

export function signalFlagId(signalId: string): string {
  return `${SIGNAL_PREFIX}${signalId}`;
}

export function personalFlagId(kind: 'green' | 'red', text: string): string {
  return `${PERSONAL_PREFIX}${kind}:${text.trim().replace(/\s+/g, ' ')}`;
}

export type ParsedFlag =
  | { source: 'signal'; signal: Signal; kind: FlagKind }
  | { source: 'personal'; kind: 'green' | 'red'; text: string };

export function signalById(id: string): Signal | undefined {
  return SIGNALS_V1.find(s => s.id === id);
}

export function parseFlagId(id: unknown): ParsedFlag | null {
  if (typeof id !== 'string') return null;
  if (id.startsWith(SIGNAL_PREFIX)) {
    const signal = signalById(id.slice(SIGNAL_PREFIX.length));
    if (!signal) return null;
    return { source: 'signal', signal, kind: signal.tier === 'green' ? 'green' : signal.tier === 'safety' ? 'safety' : 'red' };
  }
  if (id.startsWith(PERSONAL_PREFIX)) {
    const rest = id.slice(PERSONAL_PREFIX.length);
    const kind = rest.startsWith('green:') ? 'green' : rest.startsWith('red:') ? 'red' : null;
    if (!kind) return null;
    const text = rest.slice(kind.length + 1).trim();
    return text ? { source: 'personal', kind, text } : null;
  }
  return null;
}

export function flagKind(id: string): FlagKind | null {
  return parseFlagId(id)?.kind ?? null;
}

export function flagLabel(id: string): string {
  const p = parseFlagId(id);
  if (!p) return id;
  return p.source === 'signal' ? p.signal.label : p.text;
}

export const UNSAFE_FLAG = signalFlagId('unsafe');

/* ------------------------------------------------------------------ */
/* Reading what a date holds                                           */
/* ------------------------------------------------------------------ */

/**
 * Flag ids from a stored value. Before ids existed, `duringFlags` held
 * `{ text, kind, at }` objects tapped from her own list; those read as her
 * personal flags. Anything unrecognised is dropped.
 */
export function normalizeFlagIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    let id: string | null = null;
    if (typeof item === 'string') id = parseFlagId(item) ? item : null;
    else if (item && typeof item === 'object') {
      const o = item as { text?: unknown; kind?: unknown };
      if (typeof o.text === 'string' && (o.kind === 'green' || o.kind === 'red')) id = personalFlagId(o.kind, o.text);
    }
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export type FlagPhase = 'before' | 'during' | 'after';
export const FLAG_PHASES: readonly FlagPhase[] = ['before', 'during', 'after'];

const PHASE_FIELD: Record<FlagPhase, 'beforeFlags' | 'duringFlags' | 'afterFlags'> = {
  before: 'beforeFlags', during: 'duringFlags', after: 'afterFlags',
};

export function flagsIn(d: DateEntry, phase: FlagPhase): string[] {
  return normalizeFlagIds(d[PHASE_FIELD[phase]]);
}

/** Every flag on a date, any phase, each once. */
export function allFlagsOn(d: DateEntry): string[] {
  const out: string[] = [];
  for (const p of FLAG_PHASES) for (const id of flagsIn(d, p)) if (!out.includes(id)) out.push(id);
  return out;
}

/** A date entry with its flag fields as ids, whatever shape they were stored in. */
export function normalizeDateFlags(d: DateEntry): DateEntry {
  const out = { ...d };
  for (const p of FLAG_PHASES) {
    const f = PHASE_FIELD[p];
    if (d[f] !== undefined) out[f] = normalizeFlagIds(d[f]);
  }
  return out;
}
