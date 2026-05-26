// FEC Open Data API - Political donations (free, no key required)
// Docs: https://api.open.fec.gov/developers/

export interface FecResult {
  summary?: string;
  totalDonated?: number;
  recipients?: string[];
}

export async function lookupDonations(name?: string): Promise<FecResult> {
  if (!name) return { summary: 'None on record' };

  try {
    const apiKey = process.env.FEC_API_KEY ?? 'DEMO_KEY';
    const nameParts = name.trim().split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];

    const url = `https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=${encodeURIComponent(name)}&api_key=${apiKey}&per_page=5&sort=-contribution_receipt_date`;
    const res = await fetch(url);

    if (!res.ok) return { summary: 'None on record' };

    const data = await res.json();
    const results = data.results ?? [];

    if (results.length === 0) return { summary: 'None on record' };

    const total = results.reduce((sum: number, r: any) => sum + (r.contribution_receipt_amount ?? 0), 0);
    const recipients = [...new Set(results.map((r: any) => r.committee?.name).filter(Boolean))] as string[];

    return {
      summary: `$${total.toLocaleString()} total · ${recipients.slice(0, 2).join(', ')}`,
      totalDonated: total,
      recipients,
    };
  } catch {
    return { summary: 'None on record' };
  }
}
