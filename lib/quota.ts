import { getAnonSupabase, getUserSupabase } from './supabase';

export const MONTHLY_SEARCH_LIMIT = 15;
export const SINGLE_SEARCH_LIMIT = 1;
export const FOUNDING_MEMBER_CAP = 100;

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** A free account has no lookups; a plan decides how many. */
function limitForPlan(plan: string | null): number {
  if (!plan) return 0;
  return plan === 'single' ? SINGLE_SEARCH_LIMIT : MONTHLY_SEARCH_LIMIT;
}

/**
 * How many founding memberships exist. A definer function in Postgres returns
 * the one integer; nothing here needs the service role.
 */
export async function getFoundingCount(): Promise<number> {
  const sb = getAnonSupabase();
  const { data, error } = await sb.rpc('founding_count');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
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
  const sb = await getUserSupabase(userId);
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

/**
 * Spends one lookup. The work is a SECURITY DEFINER function in Postgres,
 * consume_search(), which reads the member from the JWT claim rather than an
 * argument and does the check and the increment in one statement. The billing
 * columns it writes are not grantable to members directly.
 */
export async function consumeSearch(userId: string): Promise<{ allowed: boolean; remaining: number; plan: string | null }> {
  if (UNLIMITED_EMAILS.includes(userId.toLowerCase())) {
    return { allowed: true, remaining: 9999, plan: 'annual' };
  }
  const sb = await getUserSupabase(userId);
  const { data, error } = await sb.rpc('consume_search');
  if (error) throw error;
  const r = (data ?? {}) as { allowed?: boolean; remaining?: number; plan?: string | null };
  return { allowed: r.allowed === true, remaining: r.remaining ?? 0, plan: r.plan ?? null };
}
