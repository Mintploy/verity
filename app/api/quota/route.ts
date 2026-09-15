import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getQuota } from '@/lib/quota';

/** How many lookups she has left. Reads only; spending happens in /api/search. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token).catch(() => null) : null;
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });
  try {
    return Response.json(await getQuota(session.email));
  } catch (e: any) {
    console.error('Quota error:', e);
    return Response.json({ error: 'Could not read your quota' }, { status: 500 });
  }
}
