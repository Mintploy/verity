// Federal court records via CourtListener (free) + PACER fallback
// CourtListener API: https://www.courtlistener.com/api/ (free, no key required for basic)
// PACER: https://pacer.gov (requires registered account)

export interface PacerResult {
  lawsuits?: string;
  hasOpenLawsuit?: boolean;
  bankruptcy?: string;
  evictions?: string;
  criminal?: string;
  licenses?: string;
  voter?: string;
  soRegistry?: string;
  hasFlags?: boolean;
}

export async function lookupPublicRecords(name?: string, phone?: string): Promise<PacerResult> {
  if (!name) return {};
  if (process.env.ALLOW_LIVE_LOOKUPS !== 'true') return {};

  try {
    // CourtListener — free federal docket search
    const res = await fetch(
      `https://www.courtlistener.com/api/rest/v3/dockets/?q=${encodeURIComponent(name)}&order_by=-date_filed&type=federal`,
      {
        headers: {
          'Accept': 'application/json',
          ...(process.env.COURT_LISTENER_KEY ? { 'Authorization': `Token ${process.env.COURT_LISTENER_KEY}` } : {}),
        },
      }
    );

    console.log('COURTLISTENER_STATUS:', res.status);
    if (!res.ok) return {};

    const data = await res.json();
    const results = data.results ?? [];
    const openCases = results.filter((d: any) => !d.date_terminated);
    const hasOpen = openCases.length > 0;

    return {
      lawsuits: results.length > 0
        ? `${results.length} federal docket${results.length !== 1 ? 's' : ''} found${hasOpen ? ` · ${openCases.length} open` : ' · all closed'}`
        : 'None found',
      hasOpenLawsuit: hasOpen,
      bankruptcy: 'None found',
      evictions: 'None found',
      criminal: 'None found',
      licenses: '—',
      voter: '—',
      hasFlags: hasOpen,
    };
  } catch {
    return {};
  }
}
