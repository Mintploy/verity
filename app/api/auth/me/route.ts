import type { NextRequest } from 'next/server';
import { readSession, getAccess } from '@/lib/access';

/** Who she is and what she can do. Plan and lookups are read from the profile, not the cookie. */
export async function GET(req: NextRequest) {
  const session = await readSession(req);
  if (!session) return Response.json({ authenticated: false });
  try {
    const access = await getAccess(session.email);
    return Response.json({
      authenticated: true,
      email: session.email,
      userId: session.email,
      plan: access.plan,
      identityVerified: access.identityVerified,
      lookups: access.lookups.allowed
        ? { allowed: true, remaining: access.lookups.remaining }
        : { allowed: false, reason: access.lookups.reason },
    });
  } catch {
    return Response.json({ authenticated: true, email: session.email, userId: session.email, plan: null, lookups: { allowed: false, reason: 'no-plan' } });
  }
}
