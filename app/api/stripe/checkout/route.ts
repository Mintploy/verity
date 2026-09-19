import type { NextRequest } from 'next/server';
import { normalizeEmail } from '@/lib/auth';
import { readSession, getAccess, rememberOnProfile } from '@/lib/access';
import { createCheckoutSession, findOrCreateCustomer, type Plan } from '@/lib/stripe';
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
    const { email: rawEmail, plan, returnUrl } = body as { email?: string; plan?: Plan; returnUrl?: string };
    // A signed-in member pays as herself; the body's email is only for the
    // pre-account funnel. Either way it is stored canonically.
    const session = await readSession(req);
    const email = session?.email ?? (rawEmail ? normalizeEmail(rawEmail) : undefined);

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

    // The Stripe customer is created here, at first checkout, never at
    // sign-up. Reused on every later checkout so payment mode (the single
    // report) has a customer for the webhook to key on.
    let customerId: string | undefined;
    if (session) {
      const access = await getAccess(session.email);
      customerId = await findOrCreateCustomer(session.email, access.stripeCustomerId);
      if (!access.stripeCustomerId) await rememberOnProfile(session.email, { stripe_customer_id: customerId });
    }

    const checkout = await createCheckoutSession({
      customerId,
      email: customerId ? undefined : email,
      plan,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: returnUrl ?? baseUrl,
    });

    return Response.json({ url: checkout.url, sessionId: checkout.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
