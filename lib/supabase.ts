import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';

/**
 * Three Supabase clients, in order of how much they can see.
 *
 * getUserSupabase(email) is the default for anything that touches a member's
 * data. It carries a PostgREST JWT we mint per request, signed with the
 * project's JWT secret, whose `email` claim is what every RLS policy compares
 * against user_id. A query that forgets to filter by user_id gets nothing,
 * instead of everyone's rows. The token lives five minutes and is never sent
 * to the browser.
 *
 * getAnonSupabase() is the anon key with no JWT, for the one public read that
 * is not about a member (the founding-member count, via a definer function).
 *
 * getServiceSupabase() bypasses RLS. It is for paths where there is no member
 * in the request: the Stripe webhook, the cron job, and the audit and flag
 * tables, which are written about an account rather than by it. Every call
 * site is listed in docs/SUPABASE_JWT_EXIT_PATH.md; add to that list before
 * adding a call.
 */

const TOKEN_TTL = '5m';

function url(): string {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return u;
}

function anonKey(): string {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!k) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  return k;
}

/** The legacy HS256 secret from Project Settings, JWT Keys. */
function jwtSecret(): Uint8Array {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s) throw new Error('SUPABASE_JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

/**
 * A PostgREST token for one member. `role` picks the Postgres role the query
 * runs as; `email` is the claim the policies read. Lowercased to match
 * normalizeEmail() in lib/auth.ts: a capitalised address would otherwise fail
 * to match the user_id it was stored under and lock her out of her own rows.
 * No `sub`: auth.uid() then reads null, which is what we want, since our
 * identity is the email and nothing here is a Supabase Auth user.
 */
export async function mintUserToken(email: string): Promise<string> {
  return new SignJWT({ role: 'authenticated', email: email.trim().toLowerCase() })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(jwtSecret());
}

export async function getUserSupabase(email: string): Promise<SupabaseClient> {
  const token = await mintUserToken(email);
  return createClient(url(), anonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function getAnonSupabase(): SupabaseClient {
  return createClient(url(), anonKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getServiceSupabase(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(url(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
