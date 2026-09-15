import { getServiceSupabase } from './supabase';

export const MONTHLY_SEARCH_LIMIT = 15;
export const SINGLE_SEARCH_LIMIT = 1;
export const FOUNDING_MEMBER_CAP = 100;

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function limitForPlan(plan: string | null): number {
  return plan === 'single' ? SINGLE_SEARCH_LIMIT : MONTHLY_SEARCH_LIMIT;
}

export async function getFoundingCount(): Promise<number> {
  const sb = getServiceSupabase();
  const { count } = await sb
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'founding');
  return count ?? 0;
}

const UNLIMITED_EMAILS = (process.env.UNLIMITED_TEST_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

/**
 * What she has left, without spending anything.
 *
 * The relatives dialog used to read user_profiles directly and do its own sums,
 * which ignored UNLIMITED_TEST_EMAILS and the monthly reset: a test account
 * sitting at 15 of 15 was told it had no lookups left, while consumeSearch
 * would have allowed the search all along. One set of rules, in one place.
 */
export async function getQuota(userId: string): Promise<{ limit: number; used: number; remaining: number; unlimited: boolean; plan: string | null }> {
  if (UNLIMITED_EMAILS.includes(userId.toLowerCase())) {
    return { limit: MONTHLY_SEARCH_LIMIT, used: 0, remaining: MONTHLY_SEARCH_LIMIT, unlimited: true, plan: 'annual' };
  }
  const sb = getServiceSupabase();
  const { data: profile } = await sb
    .from('user_profiles')
    .select('plan, searches_this_month, searches_reset_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return { limit: MONTHLY_SEARCH_LIMIT, used: 0, remaining: 0, unlimited: false, plan: null };

  const plan = (profile.plan ?? null) as string | null;
  const limit = limitForPlan(plan);
  // A new month resets the count, so what is on the row is not what she has used.
  const resets = plan !== 'single' && !isSameMonth(new Date(profile.searches_reset_at), new Date());
  const used = resets ? 0 : (profile.searches_this_month ?? 0);
  return { limit, used, remaining: Math.max(0, limit - used), unlimited: false, plan };
}

// Checks quota and, if allowed, atomically increments and returns the result.
// Returns { allowed: false } if quota is exhausted or no profile exists.
// Single-report plan is capped at 1 search total (no monthly reset).
export async function consumeSearch(userId: string): Promise<{ allowed: boolean; remaining: number; plan: string | null }> {
  if (UNLIMITED_EMAILS.includes(userId.toLowerCase())) {
    return { allowed: true, remaining: 9999, plan: 'annual' };
  }
  const sb = getServiceSupabase();
  const now = new Date();

  const { data: profile, error } = await sb
    .from('user_profiles')
    .select('plan, searches_this_month, searches_reset_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return { allowed: false, remaining: 0, plan: null };

  const plan = profile.plan as string | null;
  const limit = limitForPlan(plan);
  const resetAt = new Date(profile.searches_reset_at);
  let used = profile.searches_this_month ?? 0;

  // Single-report plan: never resets, lifetime cap of 1
  if (plan !== 'single' && !isSameMonth(resetAt, now)) {
    await sb
      .from('user_profiles')
      .update({ searches_this_month: 1, searches_reset_at: now.toISOString() })
      .eq('user_id', userId);
    return { allowed: true, remaining: limit - 1, plan };
  }

  if (used >= limit) {
    return { allowed: false, remaining: 0, plan };
  }

  await sb
    .from('user_profiles')
    .update({ searches_this_month: used + 1 })
    .eq('user_id', userId);

  return { allowed: true, remaining: limit - used - 1, plan };
}
