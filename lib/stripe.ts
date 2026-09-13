import Stripe from 'stripe';
import { normalizeEmail } from './auth';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

export const STRIPE_PRICE_FOUNDING = process.env.STRIPE_PRICE_FOUNDING!;
export const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL!;
export const STRIPE_PRICE_SINGLE = process.env.STRIPE_PRICE_SINGLE!;

export type Plan = 'founding' | 'annual' | 'single';

export async function createCheckoutSession({
  customerId,
  successUrl,
  cancelUrl,
  email,
  plan,
}: {
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  email?: string;
  plan: Plan;
}) {
  const priceMap: Record<Plan, string> = {
    founding: STRIPE_PRICE_FOUNDING,
    annual: STRIPE_PRICE_ANNUAL,
    single: STRIPE_PRICE_SINGLE,
  };
  const isSubscription = plan !== 'single';
  const mode = isSubscription ? 'subscription' : 'payment';

  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ['card'],
    line_items: [{ price: priceMap[plan], quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    ...(customerId ? { customer: customerId } : {}),
    ...(email ? { customer_email: email } : {}),
    ...(isSubscription ? { subscription_data: { metadata: { app: 'verity', plan } } } : {}),
    metadata: { app: 'verity', plan },
  });
  return session;
}

// Whether this person has actually completed Stripe Identity.
//
// Stripe is the source of truth; there is no local record to fall out of sync.
// Fast path is customer metadata. When that is missing, the customer is created
// at checkout, which happens *after* verification, so the first login always
// misses, we fall back to matching a verified session by the email stashed in
// its metadata, then back-fill the customer so later logins hit the fast path.
//
// The fallback scans a page of recent sessions. That is fine at current volume;
// once verification volume outgrows one page, move the write to the
// checkout.session.completed webhook so the fast path is always populated.
export async function hasVerifiedIdentity(
  email: string,
  customerId: string
): Promise<boolean> {
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && customer.metadata?.identity_verified === 'true') {
    return true;
  }

  // Both sides normalized: the metadata email was written from whatever the
  // form submitted, which may differ in case from what she typed at sign-in.
  const wanted = normalizeEmail(email);
  const sessions = await stripe.identity.verificationSessions.list({ limit: 100 });
  const match = sessions.data.find(
    (s) => s.status === 'verified' && s.metadata?.email && normalizeEmail(s.metadata.email) === wanted
  );
  if (!match) return false;

  await stripe.customers.update(customerId, {
    metadata: {
      identity_verified: 'true',
      identity_session_id: match.id,
    },
  });
  return true;
}

// Record a completed verification against the customer, if one exists yet.
// Returns false when there is no customer to write to, not an error: the
// customer is created later at checkout, and the login fallback covers it.
export async function recordVerifiedIdentity(
  email: string,
  verificationSessionId: string
): Promise<boolean> {
  const customers = await stripe.customers.list({ email: normalizeEmail(email), limit: 1 });
  const customer = customers.data[0];
  if (!customer) return false;

  await stripe.customers.update(customer.id, {
    metadata: {
      identity_verified: 'true',
      identity_session_id: verificationSessionId,
    },
  });
  return true;
}

export async function createIdentityVerificationSession({
  returnUrl,
  metadata,
}: {
  returnUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: {
      app: 'verity',
      ...metadata,
    },
    options: {
      document: {
        require_id_number: true,
        require_live_capture: true,
        require_matching_selfie: true,
        allowed_types: ['driving_license', 'passport', 'id_card'],
      },
    },
    return_url: returnUrl,
  });
  return session;
}

/**
 * Steps a founding membership up to the standard rate after its first year.
 *
 * The founding price is a flat recurring $199, so on its own it would renew at
 * $199 forever, which is not the offer: $199 covers her first year and $297
 * applies after. A plain price cannot express that, so the subscription is
 * converted to a schedule with two phases.
 *
 * end_behavior 'release' matters. When the second phase ends the schedule lets
 * go and the subscription carries on renewing at the standard price, rather
 * than cancelling her membership the moment the schedule runs out.
 *
 * Best-effort by design. A failure here must not fail the webhook, because
 * Stripe would retry it and she would receive a second welcome email; the
 * membership is already paid for and valid either way. It logs loudly instead,
 * since a silent miss means someone is billed $199 next year.
 */
export async function scheduleFoundingStepUp(subscriptionId: string): Promise<boolean> {
  if (!STRIPE_PRICE_FOUNDING || !STRIPE_PRICE_ANNUAL) {
    console.error('[stripe] Cannot schedule step-up: founding or annual price env var is unset.');
    return false;
  }

  try {
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
    const current = schedule.phases[0];

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: 'release',
      phases: [
        // This API version expresses phase length as `duration`, not the
        // `iterations` the older docs use.
        {
          items: [{ price: STRIPE_PRICE_FOUNDING, quantity: 1 }],
          start_date: current.start_date,
          duration: { interval: 'year', interval_count: 1 },
        },
        {
          items: [{ price: STRIPE_PRICE_ANNUAL, quantity: 1 }],
          duration: { interval: 'year', interval_count: 1 },
        },
      ],
      metadata: { app: 'verity', step_up: 'founding_to_annual' },
    });

    console.log(`[stripe] Founding step-up scheduled for ${subscriptionId} (schedule ${schedule.id})`);
    return true;
  } catch (err: any) {
    console.error(`[stripe] Founding step-up FAILED for ${subscriptionId}:`, err?.message ?? err);
    return false;
  }
}
