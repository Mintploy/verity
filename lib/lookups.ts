import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from './supabase';

/**
 * Lookup audit, server-side caps and abuse flags.
 *
 * These sit in front of every paid lookup and are independent of the monthly
 * quota, which is a billing limit. This is a safety limit: it bounds how fast
 * one account can look people up, notices patterns that look like fixation or
 * bulk harvesting, and refuses to build a file on a child.
 *
 * All writes go through the service role on purpose: the audit table is
 * append-only and owned by nobody in particular, and flags are written about
 * an account, not by it.
 */

export const DAILY_LOOKUP_CAP = 3;            // consumed report lookups per rolling 24h
export const DAILY_PICKER_CAP = 10;           // "who is on this number" calls per rolling 24h
export const REPEAT_SUBJECT_THRESHOLD = 3;    // same person within 30 days: soft flag, review only
export const DISTINCT_SUBJECT_THRESHOLD = 8;  // more than this many people within 7 days: hard block

const DAY_MS = 24 * 60 * 60 * 1000;

export type InputKind = 'phone' | 'name' | 'email' | 'address' | 'candidate' | 'relative' | 'picker';

export type LookupOutcome =
  | 'completed' | 'completed_unknown_age' | 'picker' | 'quota' | 'daily_cap' | 'flagged'
  | 'minor' | 'distinct_subjects' | 'error';

export type FlagReason = 'repeat_subject' | 'distinct_subjects' | 'minor_subject' | 'manual';

/** Thrown when the hashing key is not configured. Routes turn this into a 503. */
export class LookupConfigError extends Error {}

function hashSecret(): Buffer {
  const s = process.env.LOOKUP_HASH_SECRET?.trim();
  if (!s) throw new LookupConfigError('LOOKUP_HASH_SECRET is not set');
  return Buffer.from(s, 'utf8');
}

/**
 * Keyed hash of a lookup input. Namespaced by kind so a phone and a record id
 * that happen to share digits never collide.
 */
export function hashLookupKey(kind: InputKind | 'subject' | 'user', value: string): string {
  return createHmac('sha256', hashSecret()).update(`${kind}:${value}`).digest('hex');
}

/**
 * What a deleted account is called in the audit log and flags. The readable
 * email is replaced by a keyed hash of it, so the rows stay linkable to the
 * same address (with the key) and readable to nobody without it.
 */
export function deletedUserId(email: string): string {
  return `deleted:${hashLookupKey('user', email.trim().toLowerCase())}`;
}

/**
 * Account deletion calls this last. lookup_audit's trigger permits exactly
 * this transition (plaintext user_id to a `deleted:` id, nothing else changed)
 * and no other update.
 */
export async function anonymizeAuditTrail(email: string): Promise<{ audit: number; flags: number }> {
  const sb = getServiceSupabase();
  const to = deletedUserId(email);
  const a = await sb.from('lookup_audit').update({ user_id: to }).eq('user_id', email).select('id');
  if (a.error) throw a.error;
  const f = await sb.from('account_flags').update({ user_id: to }).eq('user_id', email).select('id');
  if (f.error) throw f.error;
  return { audit: a.data?.length ?? 0, flags: f.data?.length ?? 0 };
}

/**
 * Keyed hash for a His File identity field. Same secret as the audit log,
 * different namespace, so a his_files.phone_hmac and a lookup_audit
 * input_hash for the same number are different strings and the two tables
 * cannot be joined directly. hasJournalRelationship computes whichever form
 * it needs at lookup time.
 */
export function hmacHisFile(kind: 'phone' | 'name', value: string): string {
  return createHmac('sha256', hashSecret()).update(`hisfile-${kind}:${value}`).digest('hex');
}

export function normalizePhoneDigits(phone: string): string {
  return (phone ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
}

function squash(s: string): string {
  return (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * The kind and canonical string behind a search request, used to hash it.
 * A picked candidate or relative is identified by its record id, which is the
 * strongest key we have; free-text inputs are normalized the same way the
 * search itself normalizes them so retries of the same query hash the same.
 */
export function describeInput(body: {
  phone?: string; name?: string; email?: string; address?: string; location?: string;
}, chosen?: { tahoeId: string; phone: string }): { kind: InputKind; value: string } {
  if (chosen) {
    return { kind: chosen.phone ? 'candidate' : 'relative', value: chosen.tahoeId };
  }
  if (body.phone) return { kind: 'phone', value: normalizePhoneDigits(body.phone) };
  if (body.email) return { kind: 'email', value: squash(body.email) };
  if (body.name) return { kind: 'name', value: `${squash(body.name)}|${squash(body.location ?? '')}` };
  return { kind: 'address', value: `${squash(body.address ?? '')}|${squash(body.location ?? '')}` };
}

export function getClientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || null;
  return req.headers.get('x-real-ip');
}

/**
 * Under 18, from whichever of age or date of birth the record carried.
 * Unknown is not a minor: an age of 0 is how the report says "no age", and a
 * DOB that does not parse is ignored rather than read as a birthday today.
 */
export function isMinor(age?: number | null, dob?: string | null): boolean {
  if (typeof age === 'number' && age > 0) return age < 18;
  if (dob) {
    const d = new Date(dob);
    if (Number.isFinite(d.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years -= 1;
      return years >= 0 && years < 18;
    }
  }
  return false;
}

export async function recordLookup(row: {
  userId: string;
  inputHash: string;
  subjectHash?: string | null;
  inputKind: InputKind;
  ip: string | null;
  consumed: boolean;
  outcome: LookupOutcome;
}): Promise<void> {
  const sb = getServiceSupabase();
  const { error } = await sb.from('lookup_audit').insert({
    user_id: row.userId,
    input_hash: row.inputHash,
    subject_hash: row.subjectHash ?? null,
    input_kind: row.inputKind,
    ip: row.ip,
    consumed: row.consumed,
    outcome: row.outcome,
  });
  // The audit row is the record of what happened; if it cannot be written the
  // lookup should not proceed silently. Callers decide, this just surfaces it.
  if (error) throw new Error(`lookup_audit insert failed: ${error.message}`);
}

/**
 * The oldest open blocking flag, if any. Soft flags never block.
 *
 * Also checks the anonymized id: a flagged account that deletes itself and
 * signs up again with the same address is still flagged.
 */
export async function activeFlag(userId: string): Promise<{ reason: FlagReason; created_at: string } | null> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('account_flags')
    .select('reason, created_at')
    .in('user_id', [userId, deletedUserId(userId)])
    .eq('blocking', true)
    .is('cleared_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { reason: FlagReason; created_at: string } | null) ?? null;
}

export async function flagAccount(
  userId: string,
  reason: FlagReason,
  details: Record<string, unknown>,
  opts: { blocking: boolean } = { blocking: true },
): Promise<void> {
  const sb = getServiceSupabase();
  // One open flag per reason. A second identical flag adds nothing to review.
  const { data: existing } = await sb
    .from('account_flags')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', reason)
    .is('cleared_at', null)
    .limit(1);
  if (existing?.length) return;
  const { error } = await sb.from('account_flags').insert({ user_id: userId, reason, details, blocking: opts.blocking });
  if (error) throw error;
  console.warn(`[flags] account flagged: reason=${reason} blocking=${opts.blocking}`);
}

interface CountFilter {
  consumed?: boolean;
  inputKind?: InputKind;
  /** A PostgREST `or` filter string, applied as-is. */
  or?: string;
}

async function countSince(userId: string, sinceMs: number, filter: CountFilter): Promise<number> {
  const sb = getServiceSupabase();
  let q = sb
    .from('lookup_audit')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - sinceMs).toISOString());
  if (filter.consumed !== undefined) q = q.eq('consumed', filter.consumed);
  if (filter.inputKind) q = q.eq('input_kind', filter.inputKind);
  if (filter.or) q = q.or(filter.or);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function consumedLookupsLast24h(userId: string): Promise<number> {
  return countSince(userId, DAY_MS, { consumed: true });
}

export async function pickerCallsLast24h(userId: string): Promise<number> {
  return countSince(userId, DAY_MS, { inputKind: 'picker' });
}

/**
 * How many times this account has already spent a lookup on this subject in
 * the last 30 days, matching on either the resolved record or the raw input.
 * Hashes are hex, so quoting them for the `in` list is safe.
 */
export async function priorLookupsOfSubject(userId: string, hashes: string[]): Promise<number> {
  const keys = hashes.filter((h) => /^[0-9a-f]+$/.test(h));
  if (keys.length === 0) return 0;
  const list = `(${keys.join(',')})`;
  return countSince(userId, 30 * DAY_MS, {
    consumed: true,
    or: `subject_hash.in.${list},input_hash.in.${list}`,
  });
}

/** Distinct people this account has spent lookups on in the last 7 days. */
export async function distinctSubjectsLast7d(userId: string): Promise<Set<string>> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('lookup_audit')
    .select('input_hash, subject_hash')
    .eq('user_id', userId)
    .eq('consumed', true)
    .gte('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString());
  if (error) throw error;
  return new Set((data ?? []).map((r: { input_hash: string; subject_hash: string | null }) => r.subject_hash ?? r.input_hash));
}

/**
 * Whether she has a journal relationship with the man on this number: a His
 * File for it with at least one logged date. Repeat lookups on him are normal
 * and are not a signal. Only a phone links a lookup to a file, so a lookup by
 * name, email, address or relative token has no relationship and counts.
 *
 * Reads date_count, a plaintext column kept in step with the encrypted
 * `dates` array, and matches the number by its HMAC, so nothing is decrypted
 * to answer this. A file written before the HMAC backfill will not match
 * until scripts/encrypt-identity.ts --backfill has run.
 */
export async function hasJournalRelationship(userId: string, phoneDigits: string | null): Promise<boolean> {
  if (!phoneDigits || phoneDigits.length !== 10) return false;
  const sb = getServiceSupabase();
  const { count, error } = await sb
    .from('his_files')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('phone_hmac', hmacHisFile('phone', phoneDigits))
    .gte('date_count', 1);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export type Preflight =
  | { ok: true }
  | { ok: false; status: number; error: string; outcome: LookupOutcome };

const FLAGGED_MESSAGE =
  'Lookups on this account are paused while we review recent activity. Email verity@mintploy.com if you think this is a mistake.';

export interface SubjectContext {
  /** Keyed hashes that identify the subject as far as we know him so far. */
  hashes: string[];
  /** The number the lookup is on, when it is on one. Links to her His File. */
  phoneDigits: string | null;
}

/**
 * Same-subject repetition. A soft flag: it is written for review and never
 * blocks, and it is not written at all when she has a journal relationship
 * with him. `count` is the number of consumed lookups including this one.
 */
async function noteRepeatSubject(userId: string, count: number, ctx: SubjectContext): Promise<void> {
  if (count < REPEAT_SUBJECT_THRESHOLD) return;
  if (await hasJournalRelationship(userId, ctx.phoneDigits)) return;
  await flagAccount(userId, 'repeat_subject', { lookups_30d: count, linked_by_phone: !!ctx.phoneDigits }, { blocking: false });
}

/**
 * Everything that can refuse a lookup before any money is spent on it.
 *
 * Order matters: a blocking flag is refused before its patterns are counted,
 * and the pattern checks use what we know about the subject before resolution
 * (the record id behind a token, or the input itself). The same checks run
 * again after resolution in evaluatePatterns, which can flag but not refund.
 */
export async function preflightLookup(userId: string, ctx: SubjectContext): Promise<Preflight> {
  if (await activeFlag(userId)) {
    return { ok: false, status: 403, error: FLAGGED_MESSAGE, outcome: 'flagged' };
  }

  if ((await consumedLookupsLast24h(userId)) >= DAILY_LOOKUP_CAP) {
    return {
      ok: false, status: 429, outcome: 'daily_cap',
      error: `You have run ${DAILY_LOOKUP_CAP} lookups in the last 24 hours. Please come back tomorrow.`,
    };
  }

  const seen = await distinctSubjectsLast7d(userId);
  const isNew = !ctx.hashes.some((h) => seen.has(h));
  if (isNew && seen.size + 1 > DISTINCT_SUBJECT_THRESHOLD) {
    await flagAccount(userId, 'distinct_subjects', { distinct_7d: seen.size + 1 });
    return { ok: false, status: 403, error: FLAGGED_MESSAGE, outcome: 'distinct_subjects' };
  }

  // Soft. Noted for review, the lookup goes ahead.
  const prior = await priorLookupsOfSubject(userId, ctx.hashes);
  await noteRepeatSubject(userId, prior + 1, ctx);

  return { ok: true };
}

/**
 * Re-run the pattern checks against the subject the lookup actually resolved
 * to. A phone search does not know who it will find until it has paid to find
 * out, so this can only flag the account for its next lookup.
 */
export async function evaluatePatterns(
  userId: string,
  subjectHash: string | null,
  ctx: { phoneDigits: string | null },
): Promise<void> {
  const keys = subjectHash ? [subjectHash] : [];
  const prior = await priorLookupsOfSubject(userId, keys);
  await noteRepeatSubject(userId, prior, { hashes: keys, phoneDigits: ctx.phoneDigits });

  const seen = await distinctSubjectsLast7d(userId);
  if (seen.size > DISTINCT_SUBJECT_THRESHOLD) {
    await flagAccount(userId, 'distinct_subjects', { distinct_7d: seen.size });
  }
}
