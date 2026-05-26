// ATTOM Data - Property and address intelligence
// Docs: https://api.attomdata.com/

export interface AttomAddressResult {
  addresses: Array<{
    addr: string;
    years: string;
    current: boolean;
    detail: string;
    flag?: boolean;
    owned?: boolean;
  }>;
}

export async function lookupAddress(name?: string, phone?: string): Promise<AttomAddressResult> {
  const apiKey = process.env.ATTOM_API_KEY;

  if (!apiKey || apiKey === 'YOUR_ATTOM_KEY') {
    return getMockAddressData();
  }

  const res = await fetch(`https://api.gateway.attomdata.com/property/v2/attomavm/detail?address=${encodeURIComponent(name ?? '')}`, {
    headers: {
      'apikey': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`ATTOM API error: ${res.status}`);

  const data = await res.json();

  return {
    addresses: (data.property ?? []).slice(0, 5).map((p: any, i: number) => ({
      addr: `${p.address?.line1}, ${p.address?.locality}, ${p.address?.countrySubd}`,
      years: p.summary?.yearBuilt ? `${p.summary.yearBuilt}–present` : '—',
      current: i === 0,
      detail: p.building?.size?.universalsize ? `${p.building.size.universalsize.toLocaleString()} sq ft · ${p.assessment?.assessed?.assdttlvalue ? '$' + p.assessment.assessed.assdttlvalue.toLocaleString() : 'value unknown'}` : '—',
      flag: false,
    })),
  };
}

function getMockAddressData(): AttomAddressResult {
  return {
    addresses: [
      { addr: '4821 E Camelback Rd, Scottsdale, AZ 85251', years: '2021–present', current: true, detail: 'Rental · Est. $3,200/mo', owned: false },
      { addr: '312 W Palm Ln, Phoenix, AZ 85003', years: '2018–2021', current: false, detail: 'Owned · Sold $485,000' },
      { addr: '1422 N 7th St, Phoenix, AZ 85006', years: '2015–2018', current: false, detail: 'Rental · 3 years' },
    ],
  };
}
