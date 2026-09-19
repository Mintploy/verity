import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/access';
import { getUserSupabase } from '@/lib/supabase';
import { getDataKey } from '@/lib/hisfile';
import { encryptFields } from '@/lib/crypto';

/**
 * "Remind me in 30 days."
 *
 * Only offered to women without an annual membership: an annual member already
 * has the months and the lookups, so a nudge to spend one is noise. The row is
 * picked up by the cron job, which sends the email when it comes due.
 *
 * His name and number are stored encrypted under her data key; the cron job
 * decrypts the name at send time with the service role. Nothing about him is
 * readable in the table.
 */

/** The fields the reminder holds as ciphertext. */
const REMINDER_ENCRYPTED_FIELDS = ['subject_name', 'phone'] as const;

function asReportId(v: unknown): string | null {
  return typeof v === 'string' && /^VR-[A-Z0-9-]{1,40}$/i.test(v) ? v : null;
}

function asName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  return t.length > 0 && t.length <= 120 ? t : null;
}

function asPhone(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const d = v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? d : null;
}

export async function POST(req: NextRequest) {
  const session = await readSession(req);
  if (!session) return Response.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const report_id = asReportId(body?.report_id);
    const subject_name = asName(body?.subject_name);
    const phone = asPhone(body?.phone);
    if (!report_id) {
      return Response.json({ error: 'A report id is required' }, { status: 400 });
    }
    const dueAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const sb = await getUserSupabase(session.email);
    const key = await getDataKey(sb, session.email, { create: true });
    if (!key) throw new Error('Could not obtain a data key');

    const row = encryptFields(key, {
      user_id: session.email,
      report_id,
      subject_name,
      phone,
      due_at: dueAt,
      sent_at: null,
    }, REMINDER_ENCRYPTED_FIELDS);

    const { error } = await sb.from('search_reminders').upsert(row, { onConflict: 'user_id,report_id' });
    if (error) throw error;

    return Response.json({ ok: true, dueAt });
  } catch (e) {
    console.error('Reminder error:', e);
    return Response.json({ error: 'Could not set the reminder' }, { status: 500 });
  }
}
