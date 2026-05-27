import type { NextRequest } from 'next/server';
import { createIdentityVerificationSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

    const session = await createIdentityVerificationSession({
      returnUrl: `${baseUrl}/verify/complete?session_id={VERIFICATION_SESSION_ID}`,
      metadata: {
        purpose: 'female_verification',
        ...(email ? { email } : {}),
      },
    });

    return Response.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: any) {
    console.error('Stripe Identity error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
