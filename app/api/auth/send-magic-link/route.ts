import { NextRequest, NextResponse } from 'next/server';
import { createMagicLinkToken, normalizeEmail } from '@/lib/auth';
import { sendMagicLink } from '@/lib/email';
import { configErrorResponse } from '@/lib/env';
import { stripe } from '@/lib/stripe';

const REQUIRED = ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'MAGIC_LINK_SECRET'];

export async function POST(req: NextRequest) {
  const misconfigured = configErrorResponse(REQUIRED, 'Magic-link sign-in');
  if (misconfigured) return misconfigured;

  try {
    const { email: rawEmail } = await req.json();
    if (!rawEmail?.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Canonicalize before it reaches Stripe or the token: a phone keyboard
    // capitalizes the first letter, and Stripe's email filter is exact-match.
    const email = normalizeEmail(rawEmail);

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json({ error: 'No account found for that email. Please sign up first.' }, { status: 404 });
    }

    const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'active', limit: 1 });
    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No active membership found. Please complete sign-up.' }, { status: 403 });
    }

    const token = await createMagicLinkToken(email, customer.id);
    await sendMagicLink(email, token);

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    // Name the failing dependency in the log; the client still gets a generic message.
    const stage = err?.type === 'StripeAuthenticationError' ? 'Stripe rejected the API key'
      : err?.name === 'ResendError' || err?.statusCode === 401 ? 'Resend rejected the API key'
      : 'unexpected error';
    console.error(`Magic link error (${stage}):`, err);
    return NextResponse.json({ error: 'Failed to send link. Try again.' }, { status: 500 });
  }
}
