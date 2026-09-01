import Stripe from 'stripe';

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
