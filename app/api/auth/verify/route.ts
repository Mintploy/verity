import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkToken, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * The magic link lands here. It proves the address; that is all a session is.
 *
 * An address with no profile gets one, with no plan: a free account, sent
 * to the welcome flow once. A returning member lands by what she can do: a
 * plan sends her to search, no plan sends her to her journal. Nothing here
 * asks Stripe.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing-token', req.url));
  }

  try {
    const { email } = await verifyMagicLinkToken(token);

    // Service role: she has no session yet, and the row must exist before a
    // member-scoped client can see anything.
    const sb = getServiceSupabase();
    const { data: existing, error: readErr } = await sb
      .from('user_profiles').select('plan').eq('user_id', email).maybeSingle();
    if (readErr) throw readErr;

    let plan: string | null = (existing?.plan as string | null) ?? null;
    const brandNew = !existing;
    if (!existing) {
      const { error: insErr } = await sb.from('user_profiles').insert({ user_id: email, email });
      if (insErr && insErr.code !== '23505') throw insErr;
      plan = null;
    }

    const sessionToken = await createSessionToken({ email });
    // A brand-new account sees the welcome flow once. Everyone else lands
    // where they can do the most: search with a plan, the journal without.
    const res = NextResponse.redirect(new URL(brandNew ? '/welcome' : plan ? '/search' : '/hisfile', req.url));
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Magic link verify error:', err);
    return NextResponse.redirect(new URL('/login?error=expired', req.url));
  }
}
