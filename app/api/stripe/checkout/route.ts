import type { NextRequest } from 'next/server';
import { createCheckoutSession, type Plan } from '@/lib/stripe';
import { getFoundingCount, FOUNDING_MEMBER_CAP } from '@/lib/quota';

export async function GET() {
  try {
    const count = await getFoundingCount();
    const slotsLeft = Math.max(0, FOUNDING_MEMBER_CAP - count);
    return Response.json({ foundingAvailable: slotsLeft > 0, slotsLeft });
  } catch (err: any) {
    console.error('Founding count error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan, returnUrl } = body as { email?: string; plan?: Plan; returnUrl?: string };

    if (!plan || !['founding', 'annual', 'single'].includes(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (plan === 'founding') {
      const count = await getFoundingCount();
      if (count >= FOUNDING_MEMBER_CAP) {
        return Response.json({ error: 'Founding member slots are full', code: 'founding_full' }, { status: 409 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

    const session = await createCheckoutSession({
      email,
      plan,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: returnUrl ?? baseUrl,
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
