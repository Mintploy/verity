/**
 * When a logged flag becomes an offer to check him. See docs/UPSELL_TRIGGERS.md.
 *
 * Two halves. `evaluateDate` is pure: given one date entry it says which tier
 * fires, if any, and from which stage. `decideOffer` applies the limits and
 * the log against a store, which in production is the database through the
 * service role and in tests is a fake. The SAFETY tier goes around every
 * limit: the lock, the weekly cap and "don't suggest this for him" never
 * apply to it.
 *
 * Only a lookup can answer a strong signal, so only strong signals and a
 * stack of them trigger. Her personal red flags on their own never do: a
 * report cannot answer "he was rude to the waiter".
 */

import type { DateEntry } from './journal';
import { FLAG_PHASES, SECTION_LABEL, UNSAFE_FLAG, flagLabel, flagsIn, parseFlagId, type FlagPhase, type Signal } from './signals';

export type TriggerTier = 'safety' | 'strong' | 'stacked';
export type UpsellOutcome = 'shown' | 'dismissed' | 'suppressed' | 'checkout_started' | 'purchased' | 'reminded';

export const WEEKLY_OFFER_CAP = 3;
export const OFFER_WINDOW_DAYS = 7;
export const STACK_WEAK = 2;
export const STACK_RED = 3;

export interface Trigger {
  tier: TriggerTier;
  stage: FlagPhase;
  /** The strong signal, for STRONG. */
  signal?: Signal;
  /** The tagged labels the sheet names, for STACKED. */
  labels: string[];
  /** Report sections that answer it, in the report's own words. */
  sections: string[];
  /** For STACKED: which rule stacked. */
  stacked?: 'weak' | 'red';
}

const STACK_SECTIONS = ['phone intelligence', 'identity signals', 'addresses', 'public record flags'];

/** The stage where a flag sits; the latest stage when it sits in several. */
function stageOf(d: DateEntry, id: string, hint?: FlagPhase): FlagPhase {
  if (hint && flagsIn(d, hint).includes(id)) return hint;
  let found: FlagPhase | null = null;
  for (const p of FLAG_PHASES) if (flagsIn(d, p).includes(id)) found = p;
  return found ?? hint ?? 'during';
}

/**
 * Which tier a date fires, over the union of its three stages. `hint` is
 * the stage she was tapping in, when the client says; it decides the stage
 * the sheet is shaped for whenever the deciding flag sits there.
 */
export function evaluateDate(d: DateEntry, hint?: FlagPhase): Trigger | null {
  const ids: string[] = [];
  for (const p of FLAG_PHASES) for (const id of flagsIn(d, p)) if (!ids.includes(id)) ids.push(id);
  if (!ids.length) return null;

  if (ids.includes(UNSAFE_FLAG)) {
    return { tier: 'safety', stage: stageOf(d, UNSAFE_FLAG, hint), labels: [], sections: [] };
  }

  const parsed = ids.map(id => ({ id, p: parseFlagId(id) })).filter(x => x.p);
  const strong = parsed.find(x => x.p!.source === 'signal' && x.p!.signal.tier === 'strong');
  if (strong && strong.p!.source === 'signal') {
    const s = strong.p!.signal;
    return {
      tier: 'strong',
      stage: stageOf(d, strong.id, hint),
      signal: s,
      labels: [s.label],
      sections: s.answeredBy.map(sec => SECTION_LABEL[sec]),
    };
  }

  const weak = parsed.filter(x => x.p!.source === 'signal' && x.p!.signal.tier === 'weak');
  const red = parsed.filter(x => x.p!.kind === 'red');
  const stack = weak.length >= STACK_WEAK ? weak : red.length >= STACK_RED ? red : null;
  if (!stack) return null;
  const last = stack[stack.length - 1];
  return {
    tier: 'stacked',
    stage: stageOf(d, last.id, hint),
    labels: stack.map(x => flagLabel(x.id)),
    sections: STACK_SECTIONS,
    stacked: weak.length >= STACK_WEAK ? 'weak' : 'red',
  };
}

/* ------------------------------------------------------------------ */
/* Limits and the log                                                  */
/* ------------------------------------------------------------------ */

export interface OfferStore {
  /** True when this man's file says no offers. */
  noOffers(fileId: string): Promise<boolean>;
  /** Take the once-per-man-per-date lock. False when it was already taken. */
  takeLock(fileId: string, dateNumber: number, tier: 'strong' | 'stacked'): Promise<boolean>;
  /** Sheets shown (strong or stacked) in the last window. */
  shownRecently(): Promise<number>;
  log(tier: TriggerTier, stage: FlagPhase, outcome: UpsellOutcome): Promise<void>;
}

export type Decision =
  | { show: true; trigger: Trigger }
  | { show: false; reason: 'none' | 'already' | 'no-offers' | 'cap' };

/**
 * Whether to show the sheet for this date, applying the limits in order:
 * SAFETY always; then his file's preference; then the per-date lock; then
 * the weekly cap. Logs shown and suppressed; the per-date lock is silent
 * because "already shown" is not a new event.
 */
export async function decideOffer(trigger: Trigger | null, fileId: string, dateNumber: number, store: OfferStore): Promise<Decision> {
  if (!trigger) return { show: false, reason: 'none' };
  if (trigger.tier === 'safety') {
    await store.log('safety', trigger.stage, 'shown');
    return { show: true, trigger };
  }
  if (await store.noOffers(fileId)) {
    await store.log(trigger.tier, trigger.stage, 'suppressed');
    return { show: false, reason: 'no-offers' };
  }
  if (!(await store.takeLock(fileId, dateNumber, trigger.tier))) return { show: false, reason: 'already' };
  if ((await store.shownRecently()) >= WEEKLY_OFFER_CAP) {
    await store.log(trigger.tier, trigger.stage, 'suppressed');
    return { show: false, reason: 'cap' };
  }
  await store.log(trigger.tier, trigger.stage, 'shown');
  return { show: true, trigger };
}
