import type { NextRequest } from 'next/server';
import { readSession, getAccess, rememberOnProfile } from '@/lib/access';
import { createCheckoutSession, findOrCreateCustomer, isPaidPlan } from '@/lib/stripe';
import { getFoundingCount, FOUNDING_MEMBER_CAP } from '@/lib/quota';
import { getServiceSupabase } from '@/lib/supabase';
import { CREDIT_COUPON, membershipCredit } from '@/lib/upsell';

export async function GET() {
  try {
    // Whether founding places remain, never how many: the count is
    // confidential so the cap can move later without anyone having watched it.
    const count = await getFoundingCount();
    return Response.json({ foundingAvailable: count < FOUNDING_MEMBER_CAP });
  } catch (err: any) {
    console.error('Founding count error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email: rawEmail, plan, returnUrl, upsell } = body as { email?: string; plan?: unknown; returnUrl?: string; upsell?: { tier?: unknown; stage?: unknown } };
    // A signed-in member pays as herself; the body's email is only for the
    // pre-account funnel. Either way it is stored canonically.
    // Checkout belongs to an account. The free account comes first, then the
    // ID check, then payment; the body's email is ignored.
    const session = await readSession(req);
    if (!session) {
      return Response.json({ error: 'Create a free account first', code: 'signup', redirect: '/signup' }, { status: 401 });
    }
    void rawEmail;
    const email = session.email;

    if (!isPaidPlan(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (!email) {
      return Response.json({ error: 'Sign in or enter your email first' }, { status: 400 });
    }

    // The founding cap is a table of 100 numbered slots. Claiming one takes a
    // lock, so two checkouts started in the same second cannot both get the
    // last place. The hold lasts 30 minutes; the webhook confirms it on
    // payment, and an abandoned checkout gives the place back.
    if (plan === 'founding') {
      const { data: slot, error: slotErr } = await getServiceSupabase().rpc('claim_founding_slot', { p_user_id: email });
      if (slotErr) throw slotErr;
      if (slot === null || slot === undefined) {
        return Response.json({ error: 'All founding places are taken', code: 'founding_full' }, { status: 409 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

    // The Stripe customer is created here, at first checkout, never at
    // sign-up. Reused on every later checkout so payment mode (the single
    // report) has a customer for the webhook to key on.
    let customerId: string | undefined;
    if (session) {
      const access = await getAccess(session.email);
      // Women only: no payment before the ID check has passed.
      if (!access.identityVerified) {
        return Response.json({ error: 'Please verify it is you first', code: 'verify', redirect: '/verify' }, { status: 403 });
      }
      customerId = await findOrCreateCustomer(session.email, access.stripeCustomerId);
      if (!access.stripeCustomerId) await rememberOnProfile(session.email, { stripe_customer_id: customerId });
    }

    // Came from a flag sheet: tier and stage ride along so the webhook can
    // log the purchase. Never the flag, never the man.
    const metadata: Record<string, string> = {};
    const tier = upsell?.tier, stage = upsell?.stage;
    if ((tier === 'strong' || tier === 'stacked' || tier === 'safety') && (stage === 'before' || stage === 'during' || stage === 'after')) {
      metadata.upsell_tier = tier;
      metadata.upsell_stage = stage;
    }

    // Her $19 report counts toward a monthly membership for 7 days, once.
    let coupon: string | undefined;
    if (plan === 'monthly' && (await membershipCredit(email))) {
      coupon = CREDIT_COUPON;
      metadata.credit_applied = '1';
    }

    const checkout = await createCheckoutSession({
      customerId,
      email: customerId ? undefined : email,
      plan,
      coupon,
      metadata,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: returnUrl ?? baseUrl,
    });

    return Response.json({ url: checkout.url, sessionId: checkout.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
