import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendSearchReminder } from '@/lib/email';

/**
 * Sends the 30-day reminders that have come due.
 *
 * Guarded by CRON_SECRET so only the scheduler can run it. A row is marked sent
 * only after its email is accepted, never before: a failed send leaves the row
 * pending so the next run retries it, which is the right way round for
 * something she asked us to remember.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not authorized' }, { status: 401 });
  }

  const sb = getServiceSupabase();
  const { data: due, error } = await sb
    .from('search_reminders')
    .select('id, user_id, subject_name')
    .is('sent_at', null)
    .lte('due_at', new Date().toISOString())
    .limit(100);

  if (error) {
    console.error('Reminder query failed:', error);
    return Response.json({ error: 'Query failed' }, { status: 500 });
  }

  let sent = 0;
  for (const row of due ?? []) {
    try {
      await sendSearchReminder(row.user_id, row.subject_name);
      await sb.from('search_reminders').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      sent += 1;
    } catch (e) {
      console.error('Reminder send failed for', row.id, e);
    }
  }

  return Response.json({ due: due?.length ?? 0, sent });
}
