// NSOPW - National Sex Offender Public Website (free government API)
// Docs: https://www.nsopw.gov/en/Developer

export interface NsopwResult {
  onRegistry: boolean;
  details?: string;
}

export async function checkSexOffenderRegistry(name?: string): Promise<NsopwResult> {
  if (!name) return { onRegistry: false };

  try {
    const nameParts = name.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];

    const url = `https://www.nsopw.gov/api/search/SearchPublicSite?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&county=all&state=all&country=all`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return { onRegistry: false };

    const data = await res.json();
    const results = data.Results ?? [];

    return {
      onRegistry: results.length > 0,
      details: results.length > 0 ? `${results.length} record${results.length !== 1 ? 's' : ''} found` : undefined,
    };
  } catch {
    return { onRegistry: false };
  }
}
