import type { NextRequest } from 'next/server';
import { lookupCandidates } from '@/lib/apis/enformion';
import { toPublicCandidates } from '@/lib/candidates';

/**
 * Who is on this number — the picker's data source.
 *
 * This route is deliberately reachable without a session: she has to see that
 * we found her man before she has any reason to verify or pay. That makes it
 * the only unauthenticated path to a metered third-party database, so it is
 * kept to the cheap half of the pipeline and answers with the least it can —
 * a name, an approximate age and a city. No aliases, no relatives, no address
 * history, no prior cities. Those are the report, and the report is paid.
 */

// Per-IP throttle. In-memory means per-instance, so it is a speed bump against
// casual scripting rather than a guarantee; a determined caller spread across
// enough cold starts will get more than this. Move to a Supabase-backed
// counter if the Enformion bill ever shows it being worked around.
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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
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
