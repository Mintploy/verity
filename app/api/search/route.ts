import type { NextRequest } from 'next/server';
import { generateReport } from '@/lib/apis/index';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

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
    const { phone, name } = body;

    if (!phone) {
      return Response.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const report = await generateReport({ phone, name, userId: session.email });

    return Response.json({ report, searchId: report.searchId });
  } catch (err: any) {
    console.error('Search error:', err);
    return Response.json({ error: err.message ?? 'Search failed' }, { status: 500 });
  }
}
