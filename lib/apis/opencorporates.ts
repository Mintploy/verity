// OpenCorporates — free public corporate registry API (no key required for basic use)
// Searches for companies where the person is listed as an officer/director

export interface OpenCorporatesResult {
  businessEntities: string;
}

export async function lookupBusinessEntities(name?: string): Promise<OpenCorporatesResult> {
  if (!name || process.env.ALLOW_LIVE_LOOKUPS !== 'true') {
    return { businessEntities: 'None found.' };
  }

  try {
    const apiKey = process.env.OPENCORPORATES_API_KEY;
    const params = new URLSearchParams({ q: name, per_page: '10' });
    if (apiKey) params.set('api_token', apiKey);

    const res = await fetch(`https://api.opencorporates.com/v0.4/officers/search?${params}`, {
      headers: { 'Accept': 'application/json' },
    });
    console.log('OPENCORPORATES_STATUS:', res.status);

    if (!res.ok) return { businessEntities: 'None found.' };

    const data = await res.json();
    const officers: any[] = data.results?.officers ?? [];

    if (!officers.length) return { businessEntities: 'None found.' };

    const entities = officers
      .filter((o: any) => o.officer?.company?.name)
      .map((o: any) => {
        const company = o.officer.company;
        const role = o.officer.position ?? 'Officer';
        const status = company.current_status ?? company.company_status ?? '';
        const jurisdiction = company.jurisdiction_code?.toUpperCase() ?? '';
        return [company.name, role, jurisdiction, status ? `(${status})` : null].filter(Boolean).join(' · ');
      })
      .filter(Boolean)
      .slice(0, 5);

    return { businessEntities: entities.length ? entities.join('\n') : 'None found.' };
  } catch (e) {
    console.log('OPENCORPORATES_ERROR:', String(e));
    return { businessEntities: 'None found.' };
  }
}
