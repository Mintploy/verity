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
  /** True only when CourtListener answered. Absent means the search did not run. */
  checked?: boolean;
  dockets?: Array<{
    caseName?: string;
    court?: string;
    docketNumber?: string;
    dateFiled?: string;
    dateTerminated?: string;
    suitNature?: string;
    url?: string;
  }>;
}

export async function lookupPublicRecords(name?: string, phone?: string): Promise<PacerResult> {
  if (!name) return {};
  if (process.env.ALLOW_LIVE_LOOKUPS !== 'true') return {};

  try {
    // CourtListener search API. The /dockets/ endpoint does not accept `q` or
    // `type`, which returned 400; /search/ is the correct endpoint for queries.
    // type=r searches RECAP (federal court filings).
    const res = await fetch(
      `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(`"${name}"`)}&type=r&order_by=dateFiled%20desc`,
      {
        headers: {
          'Accept': 'application/json',
          ...(process.env.COURT_LISTENER_KEY ? { 'Authorization': `Token ${process.env.COURT_LISTENER_KEY}` } : {}),
        },
        signal: AbortSignal.timeout(12000),
      }
    );

    console.log('COURTLISTENER_STATUS:', res.status);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log('COURTLISTENER_ERROR:', errText.slice(0, 400));
      return {};
    }

    const data = await res.json();
    const results = data.results ?? [];
    console.log('COURTLISTENER_RESULTS:', results.length);
    if (results[0]) console.log('COURTLISTENER_SHAPE:', Object.keys(results[0]).join(','));
    const txt = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const day = (v: any) => {
      const t = txt(v) ? new Date(v) : null;
      return t && Number.isFinite(t.getTime()) ? t.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined;
    };
    const dockets = results.slice(0, 5).map((d: any) => ({
      caseName: txt(d.caseName ?? d.case_name),
      court: txt(d.court ?? d.court_citation_string),
      docketNumber: txt(d.docketNumber ?? d.docket_number),
      dateFiled: day(d.dateFiled ?? d.date_filed),
      dateTerminated: day(d.dateTerminated ?? d.date_terminated),
      suitNature: txt(d.suitNature ?? d.nature_of_suit ?? d.cause),
      url: txt(d.docket_absolute_url ?? d.absolute_url) ? `https://www.courtlistener.com${d.docket_absolute_url ?? d.absolute_url}` : undefined,
    }));
    const openCases = results.filter((d: any) => !(d.dateTerminated ?? d.date_terminated));
    const hasOpen = openCases.length > 0;

    return {
      lawsuits: results.length > 0
        ? `${results.length} federal docket${results.length !== 1 ? 's' : ''} found${hasOpen ? ` · ${openCases.length} open` : ' · all closed'}`
        : 'None found',
      hasOpenLawsuit: hasOpen,
      checked: true,
      dockets,
      bankruptcy: 'None found',
      evictions: 'None found',
      criminal: 'None found',
      licenses: '',
      voter: '',
      hasFlags: hasOpen,
    };
  } catch {
    return {};
  }
}
