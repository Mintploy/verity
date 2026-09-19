import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/access';
import { getUserProfile, upsertUserProfile, backfillCompatibility } from '@/lib/hisfile';
import type { StarSign } from '@/lib/starsigns';

// Any signed-in member: the journal is free. Shared with every journal page.
const auth = readSession;

export async function GET(req: NextRequest) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const profile = await getUserProfile(session.email);
    return Response.json({ profile });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const profile = await upsertUserProfile(session.email, session.email, body);
    if (profile?.star_sign) {
      await backfillCompatibility(session.email, profile.star_sign as StarSign);
    }
    return Response.json({ profile });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Failed' }, { status: 500 });
  }
}
