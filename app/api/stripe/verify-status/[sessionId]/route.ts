import type { NextRequest } from 'next/server';
import { stripe, recordVerifiedIdentity } from '@/lib/stripe';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await stripe.identity.verificationSessions.retrieve(
      sessionId,
      { expand: ['verified_outputs'] }
    );

    // Persist the result so login has something real to check. The customer
    // usually does not exist yet (checkout comes after verification), in which
    // case this is a no-op and the login fallback back-fills it instead.
    const email = session.metadata?.email;
    if (session.status === 'verified' && email) {
      try {
        await recordVerifiedIdentity(email, session.id);
      } catch (err) {
        // Never fail her verification because the bookkeeping write failed.
        console.error('Could not record verified identity:', err);
      }
    }

    return Response.json({
      status: session.status,
      verified: session.status === 'verified',
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
