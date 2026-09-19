import type { NextRequest } from 'next/server';
import { readSession, getAccess } from '@/lib/access';
import { getQuota } from '@/lib/quota';

/** How many lookups she has left, and if none, why. Reads only; spending happens in /api/search. */
export async function GET(req: NextRequest) {
  const session = await readSession(req);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const [quota, access] = await Promise.all([getQuota(session.email), getAccess(session.email)]);
    return Response.json({
      ...quota,
      lookups: access.lookups.allowed ? { allowed: true } : { allowed: false, reason: access.lookups.reason },
    });
  } catch (e) {
    console.error('Quota error:', e);
    return Response.json({ error: 'Could not read your quota' }, { status: 500 });
  }
}
