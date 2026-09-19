import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/access';
import { getHisFile, saveHisFile, deleteHisFile } from '@/lib/hisfile';
import { offerAfterSave, readTriggerContext } from '@/lib/upsell';

// Any signed-in member: the journal is free. Shared with every journal page.
const auth = readSession;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const file = await getHisFile(session.email, id);
    if (!file) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ file });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const ctx = readTriggerContext(body);
    const before = ctx || Array.isArray(body?.dates) ? await getHisFile(session.email, id).catch(() => null) : null;
    const { file } = await saveHisFile(session.email, { ...body, id });
    // A flag she just logged may be one a lookup can answer. Decided here,
    // after the save, with the limits in the database (lib/triggers.ts).
    let offer = null;
    try { if (file) offer = await offerAfterSave(session.email, file, ctx, before); }
    catch (e) { console.error('[upsell] offer evaluation failed:', e); }
    return Response.json({ file, offer });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    await deleteHisFile(session.email, id);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Failed' }, { status: 500 });
  }
}
