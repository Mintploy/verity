import { createMagicLinkToken, normalizeEmail } from './auth';
import { sendMagicLink } from './email';
import { getServiceSupabase } from './supabase';

/**
 * Asking for a magic link, for sign-in and sign-up alike.
 *
 * The answer is the same whatever happens: the link was asked for. Whether
 * the address has an account, whether it was over its limit, whether the
 * email went out, none of it is visible to the caller, so the form cannot be
 * used to learn who is a member. The truth goes to the server log.
 *
 * Limits: 5 per email per hour and 20 per IP per hour, counted in
 * magic_link_requests so they hold across serverless instances. The row is
 * written before the limit is checked, so a burst is counted whether or not
 * it is served.
 */

export const MAGIC_LINKS_PER_EMAIL_PER_HOUR = 5;
export const MAGIC_LINKS_PER_IP_PER_HOUR = 20;

const HOUR_MS = 60 * 60 * 1000;

async function countSince(column: 'email' | 'ip', value: string): Promise<number> {
  const sb = getServiceSupabase();
  const { count, error } = await sb
    .from('magic_link_requests')
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .gte('created_at', new Date(Date.now() - HOUR_MS).toISOString());
  if (error) throw error;
  return count ?? 0;
}

export type MagicLinkOutcome = 'sent' | 'rate_limited_email' | 'rate_limited_ip';

/**
 * Records the request, applies the limits, sends the link. The link itself
 * does not know whether the address has an account; the verify route creates
 * the profile if there is none, so sign-in and sign-up share one path.
 */
export async function requestMagicLink(rawEmail: string, ip: string | null): Promise<MagicLinkOutcome> {
  const email = normalizeEmail(rawEmail);
  const sb = getServiceSupabase();
  const { error } = await sb.from('magic_link_requests').insert({ email, ip });
  if (error) throw error;

  if ((await countSince('email', email)) > MAGIC_LINKS_PER_EMAIL_PER_HOUR) {
    console.warn('[magic-link] over the per-email limit');
    return 'rate_limited_email';
  }
  if (ip && (await countSince('ip', ip)) > MAGIC_LINKS_PER_IP_PER_HOUR) {
    console.warn('[magic-link] over the per-IP limit');
    return 'rate_limited_ip';
  }

  const token = await createMagicLinkToken(email);
  await sendMagicLink(email, token);
  return 'sent';
}

/** A well-formed address, or null. Cheap gate before anything is stored. */
export function asEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = normalizeEmail(v);
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}
