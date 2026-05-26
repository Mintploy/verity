import type { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';

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

    return Response.json({
      status: session.status,
      verified: session.status === 'verified',
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
