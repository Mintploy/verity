import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getReportByReportId } from '@/lib/hisfile';

/** The stored report behind a saved man, for when sessionStorage has lost it. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token).catch(() => null) : null;
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const { id } = await ctx.params;
  try {
    const report = await getReportByReportId(session.email, id);
    if (!report) return Response.json({ error: 'No stored report' }, { status: 404 });
    return Response.json({ report });
  } catch (e: any) {
    console.error('Report fetch error:', e);
    return Response.json({ error: 'Could not load the report' }, { status: 500 });
  }
}
