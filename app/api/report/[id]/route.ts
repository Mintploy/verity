import type { NextRequest } from 'next/server';
import { requireJournal } from '@/lib/access';
import { getReportByReportId } from '@/lib/hisfile';

/** The stored report behind a saved man, for when sessionStorage has lost it. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireJournal(req);
  if ('response' in gate) return gate.response;
  const { session } = gate;

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
