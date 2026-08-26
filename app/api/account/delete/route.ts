import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

async function auth(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return await verifySessionToken(token); } catch { return null; }
}

export async function DELETE(req: NextRequest) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceSupabase();
  const userId = session.email;

  // Delete all user data in order
  await sb.from('his_files').delete().eq('user_id', userId);
  await sb.from('verity_wrapped').delete().eq('user_id', userId);
  await sb.from('user_profiles').delete().eq('user_id', userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
