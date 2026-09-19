import Stripe from 'stripe';
import { normalizeEmail } from './auth';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

export const STRIPE_PRICE_FOUNDING = process.env.STRIPE_PRICE_FOUNDING!;
export const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL!;
export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY!;
export const STRIPE_PRICE_SINGLE = process.env.STRIPE_PRICE_SINGLE!;

/**
 * free      $0          journal only, no lookups
 * single    $19 once    1 lookup, never expires
 * monthly   $39/month   10 lookups a month, no rollover
 * annual    $349/year   10 lookups a month
 * founding  $199/year   10 lookups a month, first 100 only, price locked
 *                       for as long as the subscription stays active
 */
export type Plan = 'free' | 'single' | 'monthly' | 'annual' | 'founding';
export type PaidPlan = Exclude<Plan, 'free'>;
export const PAID_PLANS: readonly PaidPlan[] = ['single', 'monthly', 'annual', 'founding'];
export const SUBSCRIPTION_PLANS: readonly PaidPlan[] = ['monthly', 'annual', 'founding'];

export function isPaidPlan(v: unknown): v is PaidPlan {
  return typeof v === 'string' && (PAID_PLANS as readonly string[]).includes(v);
}

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
  plan: PaidPlan;
}) {
  const priceMap: Record<PaidPlan, string> = {
    founding: STRIPE_PRICE_FOUNDING,
    annual: STRIPE_PRICE_ANNUAL,
    monthly: STRIPE_PRICE_MONTHLY,
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

/**
 * Whether this address has completed Stripe Identity, with or without a
 * customer. Customer metadata is the fast path when a customer is known;
 * otherwise the recent verified sessions are matched by the email in their
 * metadata. The caller caches a true answer on user_profiles.
 */
export async function hasVerifiedIdentityForEmail(email: string, customerId?: string | null): Promise<boolean> {
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.metadata?.identity_verified === 'true') return true;
  }
  const wanted = normalizeEmail(email);
  const sessions = await stripe.identity.verificationSessions.list({ limit: 100, expand: ['data.verified_outputs'] });
  return sessions.data.some((s) => {
    if (s.status !== 'verified' || !s.metadata?.email || normalizeEmail(s.metadata.email) !== wanted) return false;
    const sex = (s.verified_outputs as ({ sex?: string | null } | null))?.sex ?? null;
    return sex === 'female';
  });
}

/**
 * Her Stripe customer, created at first checkout and not before. A free
 * account never has one.
 */
export async function findOrCreateCustomer(email: string, knownId?: string | null): Promise<string> {
  if (knownId) return knownId;
  const found = await stripe.customers.list({ email: normalizeEmail(email), limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const created = await stripe.customers.create({ email: normalizeEmail(email), metadata: { app: 'verity' } });
  return created.id;
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
