import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getUserSupabase } from '@/lib/supabase';

async function auth(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return await verifySessionToken(token); } catch { return null; }
}

export async function DELETE(req: NextRequest) {
  const session = await auth(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.email;
  const sb = await getUserSupabase(userId);

  // Delete all user data in order.
  //
  // lookup_audit and account_flags are left in place on purpose: they exist
  // to investigate abuse, and an account that deletes itself after a run of
  // lookups is exactly the one they are for. They hold keyed hashes of what
  // was searched, not the searches, and no journal content.
  await sb.from('search_reminders').delete().eq('user_id', userId);
  await sb.from('his_files').delete().eq('user_id', userId);
  await sb.from('verity_wrapped').delete().eq('user_id', userId);
  // Her profile row carries her wrapped data key: deleting it makes any
  // ciphertext the deletes above missed permanently unreadable.
  await sb.from('user_profiles').delete().eq('user_id', userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
