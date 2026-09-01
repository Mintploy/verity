import { getServiceSupabase } from './supabase';

export const MONTHLY_SEARCH_LIMIT = 15;
export const FOUNDING_MEMBER_CAP = 100;

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export async function getFoundingCount(): Promise<number> {
  const sb = getServiceSupabase();
  const { count } = await sb
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'founding');
  return count ?? 0;
}

// Checks quota and, if allowed, atomically increments and returns the result.
// Returns { allowed: false } if quota is exhausted or no profile exists.
export async function consumeSearch(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const sb = getServiceSupabase();
  const now = new Date();

  const { data: profile, error } = await sb
    .from('user_profiles')
    .select('searches_this_month, searches_reset_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return { allowed: false, remaining: 0 };

  const resetAt = new Date(profile.searches_reset_at);
  let used = profile.searches_this_month ?? 0;

  // New calendar month — reset the counter first
  if (!isSameMonth(resetAt, now)) {
    await sb
      .from('user_profiles')
      .update({ searches_this_month: 1, searches_reset_at: now.toISOString() })
      .eq('user_id', userId);
    return { allowed: true, remaining: MONTHLY_SEARCH_LIMIT - 1 };
  }

  if (used >= MONTHLY_SEARCH_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  await sb
    .from('user_profiles')
    .update({ searches_this_month: used + 1 })
    .eq('user_id', userId);

  return { allowed: true, remaining: MONTHLY_SEARCH_LIMIT - used - 1 };
}
