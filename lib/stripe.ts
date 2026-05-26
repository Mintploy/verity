import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

export const YEARLY_PRICE_ID = process.env.STRIPE_PRICE_ID!;
export const MEMBERSHIP_AMOUNT = 9900; // $99.00 in cents

export async function createCheckoutSession({
  customerId,
  successUrl,
  cancelUrl,
  email,
}: {
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  email?: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: YEARLY_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(customerId ? { customer: customerId } : {}),
    ...(email ? { customer_email: email } : {}),
    subscription_data: {
      metadata: {
        app: 'verity',
        plan: 'yearly',
      },
    },
    metadata: {
      app: 'verity',
    },
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
