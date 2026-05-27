import { NextRequest, NextResponse } from 'next/server';
import { createMagicLinkToken } from '@/lib/auth';
import { sendMagicLink } from '@/lib/email';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

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
    console.error('Magic link error:', err);
    return NextResponse.json({ error: 'Failed to send link. Try again.' }, { status: 500 });
  }
}
