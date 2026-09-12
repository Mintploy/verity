import type { NextRequest } from 'next/server';
import { generateReport } from '@/lib/apis/index';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { verifyCandidate } from '@/lib/candidates';
import { consumeSearch } from '@/lib/quota';

export async function POST(req: NextRequest) {
  try {
    // Verify session and extract user context
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    const session = await verifySessionToken(sessionToken).catch(() => null);
    if (!session) {
      return Response.json({ error: 'Session expired' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, name, email, address, location, candidateToken } = body;

    // A man she picked from the disambiguation list. The token is signed, so
    // the client can only ask for a candidate we actually offered — it carries
    // both the record id and the number it was found on.
    let tahoeId: string | undefined;
    let chosenPhone: string | undefined;
    if (candidateToken) {
      try {
        const chosen = await verifyCandidate(candidateToken);
        tahoeId = chosen.tahoeId;
        chosenPhone = chosen.phone;
      } catch {
        return Response.json(
          { error: 'That selection expired. Search again to pick.' },
          { status: 400 },
        );
      }
    }

    // Phone is the primary lookup, but a search by name, email or address is
    // equally valid — require only that at least one of them is present.
    if (!phone && !chosenPhone && !name && !email && !address) {
      return Response.json(
        { error: 'Enter a phone number, name, email or address to search' },
        { status: 400 },
      );
    }

    const quota = await consumeSearch(session.email);
    if (!quota.allowed) {
      return Response.json({ error: 'Monthly search limit reached', remaining: 0 }, { status: 429 });
    }

    const enrichHistorical = quota.plan === 'founding' || quota.plan === 'annual';
    const report = await generateReport({
      phone: chosenPhone ?? phone,
      name, email, address, location,
      tahoeId,
      userId: session.email,
      enrichHistorical,
    });

    return Response.json({ report, searchId: report.searchId, demoMode: process.env.ALLOW_LIVE_LOOKUPS !== 'true' });
  } catch (err: any) {
    console.error('Search error:', err);
    return Response.json({ error: err.message ?? 'Search failed' }, { status: 500 });
  }
}
