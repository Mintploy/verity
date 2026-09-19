import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

/**
 * Clears the session cookie with the same attributes it was set with
 * (app/api/auth/verify/route.ts), so the browser matches and drops it.
 * A bare delete relies on defaults; being explicit is what makes sign-out
 * work on every browser.
 */
function clearSession(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });
  return res;
}

/** The nav's Sign out button. */
export async function POST() {
  return clearSession(NextResponse.json({ ok: true }));
}

/** A plain link or a bookmark: sign out and land on the home page. */
export async function GET(req: NextRequest) {
  return clearSession(NextResponse.redirect(new URL('/', req.url), { status: 303 }));
}
