import type { NextRequest } from 'next/server';
import { configErrorResponse } from '@/lib/env';
import { getClientIp } from '@/lib/lookups';
import { asEmail, requestMagicLink } from '@/lib/magic';

const REQUIRED = ['RESEND_API_KEY', 'MAGIC_LINK_SECRET', 'SESSION_SECRET'];

/**
 * Free sign-up: an email and nothing else. The link that comes back creates
 * her profile when she clicks it. No Stripe customer, no plan; those come
 * at her first checkout, if she ever has one.
 *
 * The response never says whether the address already had an account.
 */
export async function POST(req: NextRequest) {
  const misconfigured = configErrorResponse(REQUIRED, 'Sign-up');
  if (misconfigured) return misconfigured;

  const body = await req.json().catch(() => ({}));
  const email = asEmail(body?.email);
  if (!email) return Response.json({ error: 'Enter a valid email address' }, { status: 400 });

  try {
    await requestMagicLink(email, getClientIp(req));
  } catch (err) {
    console.error('Sign-up magic link error:', err);
  }
  return Response.json({ sent: true });
}
