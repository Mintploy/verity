import type { NextRequest } from 'next/server';
import { generateReport } from '@/lib/apis/index';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';
import { verifyCandidate } from '@/lib/candidates';
import { consumeSearch, getQuota } from '@/lib/quota';
import {
  LookupConfigError, describeInput, evaluatePatterns, flagAccount, getClientIp,
  hashLookupKey, isMinor, preflightLookup, recordLookup,
} from '@/lib/lookups';

/**
 * One paid lookup.
 *
 * The order is deliberate. Everything that can refuse the lookup runs before
 * a cent is spent: session, flags, the 24-hour cap, the fixation and
 * harvesting patterns, and the monthly quota. The report is then built, and
 * only after it resolves do we know who it is about. If that person is under
 * 18 the report is discarded, nothing is consumed, and the account is flagged.
 * Otherwise the quota is spent, the audit row written, and the patterns
 * re-checked against the resolved subject for next time.
 *
 * Spending the quota after the report rather than before means a report that
 * fails mid-way costs her nothing. consume_search() is atomic in Postgres, so
 * two simultaneous requests cannot both take the last lookup; the earlier
 * getQuota read is only there to refuse before spending on Enformion.
 */
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  const session = await verifySessionToken(sessionToken).catch(() => null);
  if (!session) {
    return Response.json({ error: 'Session expired' }, { status: 401 });
  }
  const userId = session.email;
  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const { phone, name, email, address, location, candidateToken } = body;

    // A man she picked from the disambiguation list. The token is signed, so
    // the client can only ask for a candidate we actually offered, it carries
    // both the record id and the number it was found on.
    let chosen: { tahoeId: string; phone: string } | undefined;
    if (candidateToken) {
      try {
        chosen = await verifyCandidate(candidateToken);
      } catch {
        return Response.json(
          { error: 'That selection expired. Search again to pick.' },
          { status: 400 },
        );
      }
    }

    // Phone is the primary lookup, but a search by name, email or address is
    // equally valid, require only that at least one of them is present.
    if (!phone && !chosen && !name && !email && !address) {
      return Response.json(
        { error: 'Enter a phone number, name, email or address to search' },
        { status: 400 },
      );
    }

    const input = describeInput({ phone, name, email, address, location }, chosen);
    const inputHash = hashLookupKey(input.kind, input.value);
    // What we know about the subject before paying to resolve him.
    const knownSubjectHash = chosen ? hashLookupKey('subject', chosen.tahoeId) : null;
    const audit = (extra: Partial<Parameters<typeof recordLookup>[0]>) =>
      recordLookup({
        userId, inputHash, inputKind: input.kind, ip, consumed: false, outcome: 'error',
        subjectHash: knownSubjectHash, ...extra,
      });

    const pre = await preflightLookup(userId, {
      hashes: [inputHash, ...(knownSubjectHash ? [knownSubjectHash] : [])],
      phoneDigits: input.kind === 'phone' ? input.value : chosen?.phone || null,
    });
    if (!pre.ok) {
      await audit({ outcome: pre.outcome });
      return Response.json({ error: pre.error }, { status: pre.status });
    }

    const quotaBefore = await getQuota(userId);
    if (!quotaBefore.unlimited && quotaBefore.remaining <= 0) {
      await audit({ outcome: 'quota' });
      return Response.json({ error: 'Monthly search limit reached', remaining: 0 }, { status: 429 });
    }

    const enrichHistorical = quotaBefore.plan === 'founding' || quotaBefore.plan === 'annual';
    const { report, subjectId } = await generateReport({
      phone: chosen?.phone || phone,
      name, email, address, location,
      tahoeId: chosen?.tahoeId,
      userId,
      enrichHistorical,
    });
    const subjectHash = subjectId ? hashLookupKey('subject', subjectId) : knownSubjectHash;

    // Hard stop. The report is not returned, not saved, and not paid for by
    // her quota; the account goes to review.
    if (isMinor(report.subject.age, report.subject.dob)) {
      await flagAccount(userId, 'minor_subject', { input_kind: input.kind });
      await audit({ outcome: 'minor', subjectHash });
      return Response.json(
        { error: 'This lookup resolved to a person under 18 and has been stopped. Lookups on this account are paused while we review.' },
        { status: 403 },
      );
    }

    const quota = await consumeSearch(userId);
    if (!quota.allowed) {
      await audit({ outcome: 'quota', subjectHash });
      return Response.json({ error: 'Monthly search limit reached', remaining: 0 }, { status: 429 });
    }

    // Logged as its own outcome so it is visible how often the under-18 guard
    // had nothing to check: no age and no date of birth on the record.
    const ageUnknown = !(report.subject.age > 0) && !report.subject.dob;
    await audit({ outcome: ageUnknown ? 'completed_unknown_age' : 'completed', consumed: true, subjectHash });
    // Flags for next time; this lookup has already been made.
    await evaluatePatterns(userId, subjectHash, {
      phoneDigits: input.kind === 'phone' ? input.value : chosen?.phone || null,
    }).catch((e) => console.error('Pattern check failed:', e));

    return Response.json({ report, searchId: report.searchId, demoMode: process.env.ALLOW_LIVE_LOOKUPS !== 'true' });
  } catch (err) {
    if (err instanceof LookupConfigError) {
      console.error('[config] Lookups are unavailable:', err.message);
      return Response.json({ error: 'Search is temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }
    console.error('Search error:', err);
    return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
