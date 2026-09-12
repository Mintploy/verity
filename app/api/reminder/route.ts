import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

/**
 * "Remind me in 30 days."
 *
 * Only offered to women without an annual membership: an annual member already
 * has the months and the lookups, so a nudge to spend one is noise. The row is
 * picked up by the cron job, which sends the email when it comes due.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token).catch(() => null) : null;
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const { report_id, subject_name, phone } = await req.json();
    const dueAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const sb = getServiceSupabase();
    const { error } = await sb.from('search_reminders').upsert(
      {
        user_id: session.email,
        report_id: report_id ?? null,
        subject_name: subject_name ?? null,
        phone: phone ?? null,
        due_at: dueAt,
        sent_at: null,
      },
      { onConflict: 'user_id,report_id' },
    );
    if (error) throw error;

    return Response.json({ ok: true, dueAt });
  } catch (e: any) {
    console.error('Reminder error:', e);
    return Response.json({ error: 'Could not set the reminder' }, { status: 500 });
  }
}
