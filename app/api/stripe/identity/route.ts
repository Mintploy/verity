import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/access';
import { createIdentityVerificationSession } from '@/lib/stripe';

/**
 * Starts the ID check for the signed-in member. The address on the session
 * is what the result is recorded against; nothing here is typed.
 */
export async function POST(req: NextRequest) {
  const session = await readSession(req);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const vs = await createIdentityVerificationSession({
      returnUrl: `${baseUrl}/verify/complete?session_id={VERIFICATION_SESSION_ID}`,
      metadata: { purpose: 'female_verification', email: session.email },
    });
    return Response.json({ clientSecret: vs.client_secret, sessionId: vs.id, url: vs.url });
  } catch (err) {
    console.error('Stripe Identity error:', err);
    return Response.json({ error: 'Could not start verification. Please try again.' }, { status: 500 });
  }
}
