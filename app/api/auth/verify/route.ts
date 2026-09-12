import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkToken, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { stripe, hasVerifiedIdentity } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing-token', req.url));
  }

  try {
    const { email, stripeCustomerId } = await verifyMagicLinkToken(token);

    // Confirm subscription is still active
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.redirect(new URL('/checkout?reason=no-subscription', req.url));
    }

    // "Verified women only" is the product promise, enforce it rather than
    // asserting it. Fails closed: any doubt sends her back through ID check.
    const identityVerified = await hasVerifiedIdentity(email, stripeCustomerId);
    if (!identityVerified) {
      return NextResponse.redirect(new URL('/verify?reason=identity-required', req.url));
    }

    const sessionToken = await createSessionToken({
      email,
      stripeCustomerId,
      identityVerified,
    });

    const res = NextResponse.redirect(new URL('/search', req.url));
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;
  } catch {
    return NextResponse.redirect(new URL('/login?error=expired', req.url));
  }
}
