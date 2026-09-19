import type { NextRequest } from 'next/server';
import { lookupCandidates } from '@/lib/apis/enformion';
import { requireLookups } from '@/lib/access';
import { toPublicCandidates } from '@/lib/candidates';
import { withCallTally, summarize } from '@/lib/apis/callcount';
import {
  DAILY_PICKER_CAP, LookupConfigError, activeFlag, getClientIp, hashLookupKey,
  isMinor, normalizePhoneDigits, pickerCallsLast24h, recordLookup,
} from '@/lib/lookups';

/**
 * Who is on this number, the picker's data source.
 *
 * Members only. She types his number on the landing page, but nothing is
 * looked up until she has verified and paid, so by the time this runs she is
 * already a member. That keeps the one metered third-party database we pay
 * per call for off the open internet entirely.
 *
 * It still answers with the least that lets her recognise him, a name, an
 * approximate age, a city. The aliases, relatives and address history are the
 * report, and the report is a separate, quota-counted call.
 *
 * Every call is written to the audit log and capped per account per 24 hours
 * from that log, which holds across serverless instances where an in-memory
 * counter did not. A flagged account gets nothing here either. Anyone under
 * 18 on the number is left off the list, so she cannot pick a child.
 */
export async function POST(req: NextRequest) {
  const gate = await requireLookups(req);
  if ('response' in gate) return gate.response;
  const userId = gate.session.email;

  try {
    const { phone } = await req.json();
    const digits = normalizePhoneDigits(phone ?? '');
    if (digits.length !== 10) {
      return Response.json({ error: 'Enter a 10-digit US phone number' }, { status: 400 });
    }

    if (await activeFlag(userId)) {
      return Response.json(
        { error: 'Lookups on this account are paused while we review recent activity. Email verity@mintploy.com if you think this is a mistake.' },
        { status: 403 },
      );
    }

    if ((await pickerCallsLast24h(userId)) >= DAILY_PICKER_CAP) {
      return Response.json(
        { error: 'Too many number checks today. Please come back tomorrow.' },
        { status: 429 },
      );
    }

    await recordLookup({
      userId,
      inputHash: hashLookupKey('phone', digits),
      inputKind: 'picker',
      ip: getClientIp(req),
      consumed: false,
      outcome: 'picker',
    });

    // The picker is billed as well as the report. lookupCandidates runs
    // ReversePhoneSearch, which retries up to three number formats and is
    // charged for each attempt, so a search that only matches on the third
    // format has already cost three calls before the report begins. Counting it
    // here, separately, keeps the true cost of one woman's search visible as
    // two honest lines rather than one understated one.
    const candidates = await withCallTally(async (tally) => {
      try {
        return await lookupCandidates(digits);
      } finally {
        console.log('ENFORMION_BILLING[picker]:', summarize(tally));
      }
    });
    const adults = candidates.filter((c) => !isMinor(c.age));
    return Response.json({ candidates: await toPublicCandidates(adults, digits) });
  } catch (err) {
    if (err instanceof LookupConfigError) {
      console.error('[config] Lookups are unavailable:', err.message);
      return Response.json({ error: 'Search is temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }
    console.error('Matches error:', err);
    return Response.json({ error: 'Search failed. Try again.' }, { status: 500 });
  }
}
