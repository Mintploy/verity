/**
 * Server side of the offer: the store behind lib/triggers.ts (service role,
 * since members have no access to the lock or the log), the event log, and
 * the payload the sheet needs about her plan.
 */

import type { NextRequest } from 'next/server';
import { getServiceSupabase } from './supabase';
import { getAccess, readSession } from './access';
import { OFFER_WINDOW_DAYS, decideOffer, evaluateDate, type OfferStore, type Trigger, type TriggerTier, type UpsellOutcome } from './triggers';
import type { HisFile } from './hisfile';
import { UNSAFE_FLAG, allFlagsOn, type FlagPhase } from './signals';

export type PlanLabel = 'free' | 'single' | 'monthly' | 'annual' | 'founding';

export async function logUpsellEvent(userId: string, tier: TriggerTier, stage: FlagPhase, outcome: UpsellOutcome, plan?: string | null): Promise<void> {
  const sb = getServiceSupabase();
  let p = plan;
  if (p === undefined) {
    const { data } = await sb.from('user_profiles').select('plan').eq('user_id', userId).maybeSingle();
    p = (data?.plan as string | null) ?? null;
  }
  const { error } = await sb.from('upsell_events').insert({ user_id: userId, tier, stage, plan: p ?? 'free', outcome });
  if (error) console.error('[upsell] could not log event:', error.message);
}

export function dbStore(userId: string, plan: string | null): OfferStore {
  const sb = getServiceSupabase();
  return {
    async noOffers(fileId) {
      const { data } = await sb.from('his_files').select('no_offers').eq('user_id', userId).eq('id', fileId).maybeSingle();
      return data?.no_offers === true;
    },
    async takeLock(fileId, dateNumber, tier) {
      const { error } = await sb.from('upsell_offers').insert({ user_id: userId, file_id: fileId, date_number: dateNumber, tier });
      if (!error) return true;
      if (error.code === '23505') return false;
      throw error;
    },
    async shownRecently() {
      const since = new Date(Date.now() - OFFER_WINDOW_DAYS * 86400000).toISOString();
      const { count } = await sb.from('upsell_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('outcome', 'shown').in('tier', ['strong', 'stacked']).gte('created_at', since);
      return count ?? 0;
    },
    async log(tier, stage, outcome) { await logUpsellEvent(userId, tier, stage, outcome, plan); },
  };
}

/** What the sheet shows, beyond the trigger itself. Nothing about the flag beyond the trigger. */
export interface OfferPayload {
  tier: TriggerTier;
  stage: FlagPhase;
  signalId?: string;
  labels: string[];
  sections: string[];
  stacked?: 'weak' | 'red';
  plan: PlanLabel;
  /** Credits left this month, or her single report if unused. -1 means unlimited. */
  remaining: number;
  identityVerified: boolean;
  phoneOnFile: boolean;
  dateNumber: number;
}

/** The trigger context the client sends with a save: which date, which stage she was on. */
export function readTriggerContext(body: unknown): { dateNumber: number; phase?: FlagPhase } | null {
  const ctx = (body as { trigger_context?: unknown })?.trigger_context as { dateNumber?: unknown; phase?: unknown } | undefined;
  if (!ctx || typeof ctx.dateNumber !== 'number' || !Number.isInteger(ctx.dateNumber) || ctx.dateNumber < 1) return null;
  const phase = ctx.phase === 'before' || ctx.phase === 'during' || ctx.phase === 'after' ? ctx.phase : undefined;
  return { dateNumber: ctx.dateNumber, phase };
}

/**
 * After a save: evaluate the date she was on (or every date, on a full
 * form save), apply the limits, and return what the sheet needs, or null.
 */
export async function offerAfterSave(email: string, file: HisFile, ctx: { dateNumber: number; phase?: FlagPhase } | null, before: HisFile | null): Promise<OfferPayload | null> {
  if (!file.id || (file.file_type ?? 'dating') !== 'dating') return null;
  const dates = file.dates ?? [];
  const candidates = ctx ? dates.filter(d => d.number === ctx.dateNumber) : dates;
  if (!candidates.length) return null;
  // The safety sheet opens when "unsafe" is newly tagged, not on every save
  // that carries it. The lock does the same job for the other tiers.
  const unsafeBefore = new Set((before?.dates ?? []).filter(d => allFlagsOn(d).includes(UNSAFE_FLAG)).map(d => d.number));

  const access = await getAccess(email);
  // An allowlisted test account has unlimited lookups and no plan on its
  // profile; for the sheet it is a member, not a free user.
  const plan = (access.plan ?? (access.lookups.allowed && access.lookups.unlimited ? 'annual' : 'free')) as PlanLabel;
  const store = dbStore(email, access.plan);

  // Safety first, on any date; then the first date that fires.
  const evaluated = candidates.map(d => ({ d, t: evaluateDate(d, ctx?.phase) })).filter(x => x.t) as Array<{ d: typeof dates[number]; t: Trigger }>;
  evaluated.sort((a, b) => (a.t.tier === 'safety' ? 0 : 1) - (b.t.tier === 'safety' ? 0 : 1));
  for (const { d, t } of evaluated) {
    if (t.tier === 'safety' && unsafeBefore.has(d.number)) continue;
    const decision = await decideOffer(t, file.id, d.number, store);
    if (!decision.show) continue;
    const tr = decision.trigger;
    return {
      tier: tr.tier, stage: tr.stage, signalId: tr.signal?.id, labels: tr.labels, sections: tr.sections, stacked: tr.stacked,
      plan,
      remaining: access.lookups.allowed ? (access.lookups.unlimited ? -1 : access.lookups.remaining) : 0,
      identityVerified: access.identityVerified,
      phoneOnFile: !!(file.phone && file.phone.replace(/\D/g, '').length >= 10),
      dateNumber: d.number,
    };
  }
  return null;
}

/** Whether her $19 report still counts toward a monthly membership, and until when. */
export async function membershipCredit(email: string): Promise<{ until: string } | null> {
  const sb = getServiceSupabase();
  const { data } = await sb.from('user_profiles').select('single_purchased_at, credit_offer_used_at').eq('user_id', email).maybeSingle();
  if (!data?.single_purchased_at || data.credit_offer_used_at) return null;
  const until = new Date(new Date(data.single_purchased_at as string).getTime() + 7 * 86400000);
  return until.getTime() > Date.now() ? { until: until.toISOString() } : null;
}

export const CREDIT_COUPON = process.env.STRIPE_COUPON_SINGLE_CREDIT ?? 'single-credit-19';

/** For routes that only need to know who she is and log an outcome. */
export async function sessionFor(req: NextRequest) { return readSession(req); }
