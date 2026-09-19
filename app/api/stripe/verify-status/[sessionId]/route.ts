import type { NextRequest } from 'next/server';
import { stripe, recordVerifiedIdentity } from '@/lib/stripe';
import { readSession, rememberOnProfile } from '@/lib/access';

/**
 * The result of an ID check, for the page that waits on it.
 *
 * Verity is for women, and the check fails closed. Stripe Identity reads the
 * sex printed on the document into verified_outputs.sex when the document
 * carries it. Only a document that says female is accepted; a document
 * that says male, or carries no sex field at all, is not. The missing-field
 * case is logged so its rate is visible.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    const session = await stripe.identity.verificationSessions.retrieve(sessionId, { expand: ['verified_outputs'] });

    const outputs = (session.verified_outputs ?? null) as ({ sex?: string | null } | null);
    const sex = outputs?.sex ?? null;
    const eligible = session.status === 'verified' && sex === 'female';
    if (session.status === 'verified' && !sex) console.warn('[identity] verified document carried no sex field; not accepted');

    if (session.status === 'verified' && !eligible) {
      return Response.json({ status: 'not_eligible', verified: false });
    }

    const email = session.metadata?.email;
    if (eligible && email) {
      try {
        await recordVerifiedIdentity(email, session.id);
      } catch (err) {
        // Never fail her verification because the bookkeeping write failed.
        console.error('Could not record verified identity:', err);
      }
      const signedIn = await readSession(req);
      if (signedIn && signedIn.email === email.trim().toLowerCase()) {
        await rememberOnProfile(signedIn.email, { identity_verified: true });
      }
    }

    return Response.json({ status: session.status, verified: eligible });
  } catch (err) {
    console.error('Verify status error:', err);
    return Response.json({ error: 'Could not check verification' }, { status: 500 });
  }
}
