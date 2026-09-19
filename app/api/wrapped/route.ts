import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/access';
import { generateWrapped } from '@/lib/hisfile';

// Any signed-in member: the journal is free. Shared with every journal page.
const auth = readSession;

export async function POST(req: NextRequest) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { year } = await req.json();
    const wrapped = await generateWrapped(session.email, year ?? new Date().getFullYear());
    if (!wrapped) return Response.json({ error: 'No files found for this year' }, { status: 404 });
    return Response.json({ wrapped });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Failed' }, { status: 500 });
  }
}
