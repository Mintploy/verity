import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './auth';
import { getQuota } from './quota';
import { getServiceSupabase, getUserSupabase } from './supabase';
import { hasVerifiedIdentityForEmail } from './stripe';

/**
 * What a signed-in member can do, decided by capability rather than by
 * having signed in.
 *
 * Every signed-in member has the journal: His Files, and the Milestones,
 * Highlights and Patterns pages as they arrive, all through requireJournal.
 * Lookups (search, the picker, reports) need a plan with credits left and a
 * completed ID check, through requireLookups. A route that refuses on
 * capability answers 402 with `code: 'upgrade'` and a `redirect`, and the
 * pages send her to pricing rather than showing an error.
 *
 * Plan, credits and verification come from user_profiles and Stripe, never
 * from the session token. Two facts are cached on the profile once known
 * (stripe_customer_id, identity_verified); the first request that needs
 * them looks them up in Stripe and writes them back with the service role.
 */

export interface Session { email: string }

export type LookupBlock = 'no-plan' | 'no-credits' | 'not-verified';

export interface Access {
  email: string;
  plan: string | null;
  identityVerified: boolean;
  stripeCustomerId: string | null;
  journal: true;
  lookups: { allowed: true; remaining: number; unlimited: boolean } | { allowed: false; reason: LookupBlock; remaining: 0 };
}

export async function readSession(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return await verifySessionToken(token); } catch { return null; }
}

/** Every signed-in member. The journal gate. */
export async function requireJournal(req: NextRequest): Promise<{ session: Session } | { response: Response }> {
  const session = await readSession(req);
  if (!session) return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  return { session };
}

async function profileFacts(email: string): Promise<{ plan: string | null; identityVerified: boolean; stripeCustomerId: string | null }> {
  const sb = await getUserSupabase(email);
  const { data } = await sb.from('user_profiles')
    .select('plan, identity_verified, stripe_customer_id')
    .eq('user_id', email)
    .maybeSingle();
  return {
    plan: (data?.plan as string | null) ?? null,
    identityVerified: data?.identity_verified === true,
    stripeCustomerId: (data?.stripe_customer_id as string | null) ?? null,
  };
}

/** Server-only columns; the member cannot write these herself. */
export async function rememberOnProfile(email: string, patch: { identity_verified?: boolean; stripe_customer_id?: string }): Promise<void> {
  const sb = getServiceSupabase();
  const { error } = await sb.from('user_profiles').update(patch).eq('user_id', email);
  if (error) console.error('[access] could not cache profile facts:', error.message);
}

export async function getAccess(email: string): Promise<Access> {
  const facts = await profileFacts(email);
  const quota = await getQuota(email);

  // Verification, lazily: members who verified before the column existed
  // are looked up once in Stripe and remembered.
  let identityVerified = facts.identityVerified;
  if (!identityVerified && (quota.unlimited || facts.plan)) {
    try {
      identityVerified = await hasVerifiedIdentityForEmail(email, facts.stripeCustomerId);
      if (identityVerified) await rememberOnProfile(email, { identity_verified: true });
    } catch (e) {
      console.error('[access] identity check failed:', e);
    }
  }

  const base = { email, plan: facts.plan, identityVerified, stripeCustomerId: facts.stripeCustomerId, journal: true as const };
  if (!quota.unlimited && !facts.plan) return { ...base, lookups: { allowed: false, reason: 'no-plan', remaining: 0 } };
  if (!identityVerified && !quota.unlimited) return { ...base, lookups: { allowed: false, reason: 'not-verified', remaining: 0 } };
  if (!quota.unlimited && quota.remaining <= 0) return { ...base, lookups: { allowed: false, reason: 'no-credits', remaining: 0 } };
  return { ...base, lookups: { allowed: true, remaining: quota.unlimited ? 9999 : quota.remaining, unlimited: quota.unlimited } };
}

/** Where a blocked lookup sends her. */
export function upgradePath(reason: LookupBlock): string {
  return reason === 'not-verified' ? '/verify?reason=identity-required' : `/checkout?reason=${reason}`;
}

/**
 * Signed in, with lookup capability. A 402 carries `code: 'upgrade'` and the
 * page to send her to; the client treats it as a redirect, not an error.
 */
export async function requireLookups(req: NextRequest): Promise<{ session: Session; access: Access } | { response: Response }> {
  const session = await readSession(req);
  if (!session) return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  const access = await getAccess(session.email);
  if (!access.lookups.allowed) {
    const reason = access.lookups.reason;
    return {
      response: Response.json(
        { error: 'This needs a plan with lookups.', code: 'upgrade', reason, redirect: upgradePath(reason) },
        { status: 402 },
      ),
    };
  }
  return { session, access };
}
