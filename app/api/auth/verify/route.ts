import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLinkToken, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * The magic link lands here. It proves the address; that is all a session is.
 *
 * An address with no profile gets one, with no plan: a free account. Where
 * she lands depends on what she can do: a plan sends her to search, no plan
 * sends her to her journal. Nothing here asks Stripe.
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
    if (!existing) {
      const { error: insErr } = await sb.from('user_profiles').insert({ user_id: email, email });
      if (insErr && insErr.code !== '23505') throw insErr;
      plan = null;
    }

    const sessionToken = await createSessionToken({ email });
    const res = NextResponse.redirect(new URL(plan ? '/search' : '/hisfile', req.url));
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
