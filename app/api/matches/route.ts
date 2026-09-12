import type { NextRequest } from 'next/server';
import { lookupCandidates } from '@/lib/apis/enformion';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { toPublicCandidates } from '@/lib/candidates';

/**
 * Who is on this number, the picker's data source.
 *
 * Members only. She types his number on the landing page, but nothing is
 * looked up until she has verified and paid, so by the time this runs she is
 * already a member. That keeps the one metered third-party database we pay
 * per call for off the open internet entirely.
 *
 * It still answers with the least that lets her recognise him, a name, an
 * approximate age, a city. The aliases, relatives and address history are the
 * report, and the report is a separate, quota-counted call.
 */

// Per-member throttle. In-memory means per-instance, so it is a backstop
// against a runaway client rather than a quota, the real spend limit is
// consumeSearch on the report itself.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Bound the map so a spray of unique IPs cannot grow it without limit.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    const session = sessionToken
      ? await verifySessionToken(sessionToken).catch(() => null)
      : null;
    if (!session) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Throttled per member now rather than per IP, but kept: a picker refresh
    // loop would otherwise bill us once per render.
    const ip = session.email;
    if (rateLimited(ip)) {
      return Response.json(
        { error: 'Too many searches. Wait a moment and try again.' },
        { status: 429 },
      );
    }

    const { phone } = await req.json();
    const digits = (phone ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (digits.length !== 10) {
      return Response.json({ error: 'Enter a 10-digit US phone number' }, { status: 400 });
    }

    const candidates = await lookupCandidates(digits);
    return Response.json({ candidates: await toPublicCandidates(candidates, digits) });
  } catch (err: any) {
    console.error('Matches error:', err);
    return Response.json({ error: 'Search failed. Try again.' }, { status: 500 });
  }
}
