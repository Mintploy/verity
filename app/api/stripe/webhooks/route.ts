import type { NextRequest } from 'next/server';
import { stripe, isPaidPlan } from '@/lib/stripe';
import { createMagicLinkToken, normalizeEmail } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { getServiceSupabase } from '@/lib/supabase';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return Response.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>;

  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return Response.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email ?? session.customer_details?.email;
        const customerId = session.customer as string;

        if (email && customerId) {
          const plan = isPaidPlan(session.metadata?.plan) ? session.metadata!.plan : 'annual';

          const sb = getServiceSupabase();
          await sb.from('user_profiles').upsert(
            {
              user_id: normalizeEmail(email),
              email: normalizeEmail(email),
              plan,
              stripe_customer_id: customerId,
              searches_this_month: 0,
              searches_reset_at: new Date().toISOString(),
            },
            { onConflict: 'user_id', ignoreDuplicates: false }
          );

          // Her founding place, confirmed. The price is locked by doing
          // nothing: the subscription renews at the founding price for as
          // long as it stays active.
          if (plan === 'founding') {
            const { data: slot } = await sb.rpc('confirm_founding_slot', { p_user_id: normalizeEmail(email) });
            if (slot === null || slot === undefined) {
              console.error(`[founding] payment received but no slot could be confirmed for a founding checkout (customer ${customerId})`);
            }
          }

          const token = await createMagicLinkToken(email);
          await sendWelcomeEmail(email, token, plan);
          console.log(`✓ Welcome email sent to ${email} (plan: ${plan})`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`✓ Subscription ${sub.id} ${event.type.split('.')[2]}, status: ${sub.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`✗ Subscription ${sub.id} cancelled`);
        break;
      }

      case 'invoice.paid': {
        // A renewal ends the grandfathered 15-a-month; from this cycle she is
        // on the plan's current limit.
        const invoice = event.data.object as Stripe.Invoice;
        const cycle = (invoice as unknown as { billing_reason?: string }).billing_reason === 'subscription_cycle';
        if (cycle && typeof invoice.customer === 'string') {
          const sb = getServiceSupabase();
          await sb.from('user_profiles')
            .update({ grandfathered_limit: null })
            .eq('stripe_customer_id', invoice.customer)
            .not('grandfathered_limit', 'is', null);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`✗ Payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return Response.json({ error: 'Handler failed' }, { status: 500 });
  }

  return Response.json({ received: true });
}
