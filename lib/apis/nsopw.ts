// NSOPW - National Sex Offender Public Website
// Docs: https://www.nsopw.gov/en/Developer
//
// NSOPW does not expose an unauthenticated JSON search endpoint. The legacy
// /api/search/SearchPublicSite path now returns 404. Real access requires a
// registered API key issued by NSOPW.
//
// SAFETY: `checked` distinguishes "we searched and found nothing" from "we were
// unable to search". Never render a failed check as "Not listed" — that is a
// false assurance, which is the most dangerous possible failure mode for this
// product.

export interface NsopwResult {
  onRegistry: boolean;
  checked: boolean;
  details?: string;
}

export async function checkSexOffenderRegistry(name?: string): Promise<NsopwResult> {
  if (!name) return { onRegistry: false, checked: false };
  if (process.env.ALLOW_LIVE_LOOKUPS !== 'true') return { onRegistry: false, checked: false };

  const apiKey = process.env.NSOPW_API_KEY;
  if (!apiKey) {
    console.log('NSOPW_SKIPPED: no NSOPW_API_KEY configured');
    return { onRegistry: false, checked: false };
  }

  try {
    const nameParts = name.trim().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];

    const res = await fetch('https://api.nsopw.gov/v1/search', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ firstName, lastName }),
      signal: AbortSignal.timeout(12000),
    });

    console.log('NSOPW_STATUS:', res.status);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log('NSOPW_ERROR:', errText.slice(0, 400));
      return { onRegistry: false, checked: false };
    }

    const data = await res.json();
    const results = data.offenders ?? data.Results ?? data.results ?? [];
    console.log('NSOPW_RESULTS:', results.length);

    return {
      onRegistry: results.length > 0,
      checked: true,
      details: results.length > 0
        ? `${results.length} record${results.length !== 1 ? 's' : ''} found`
        : undefined,
    };
  } catch (e: any) {
    console.log('NSOPW_EXCEPTION:', String(e));
    return { onRegistry: false, checked: false };
  }
}
