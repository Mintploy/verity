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
    return getMockAddressData(phone);
  }

  try {
    const res = await fetch(`https://api.gateway.attomdata.com/property/v2/attomavm/detail?address=${encodeURIComponent(name ?? '')}`, {
      headers: { 'apikey': apiKey, 'Accept': 'application/json' },
    });

    if (!res.ok) return getMockAddressData(phone);

    const data = await res.json();
    const properties = data.property ?? [];

    return {
      addresses: properties.slice(0, 5).map((p: any, i: number) => ({
        addr: `${p.address?.line1 ?? '—'}, ${p.address?.city ?? '—'}, ${p.address?.state ?? '—'}`,
        years: p.vintage?.lastModified ? `${new Date().getFullYear() - new Date(p.vintage.lastModified).getFullYear()} years` : '—',
        current: i === 0,
        detail: p.building?.summary?.propertyType ?? 'Residential',
        owned: p.sale?.amount?.saleAmt > 0,
      })),
    };
  } catch {
    return getMockAddressData(phone);
  }
}

const ADDRESS_SETS = [
  [
    { addr: '2847 Oak Canyon Dr, Scottsdale, AZ 85255', years: '3 years', current: true, detail: 'Single-family, rented. Assessed $1.2M.', owned: false },
    { addr: '1205 N 68th St, Unit 4, Phoenix, AZ 85008', years: '2019–2021', current: false, detail: 'Apartment, rented.' },
    { addr: '9332 E Shea Blvd, Scottsdale, AZ 85260', years: '2016–2019', current: false, detail: 'Condo, sold 2019 — $340,000.' },
  ],
  [
    { addr: '184 W 10th St, Apt 12C, New York, NY 10014', years: '5 years', current: true, detail: 'Apartment, rented. Est. $6,200/mo.', owned: false },
    { addr: '220 Riverside Blvd, Apt 8D, New York, NY 10069', years: '2016–2019', current: false, detail: 'Apartment, rented.' },
  ],
  [
    { addr: '1742 Mulholland Dr, Los Angeles, CA 90046', years: '2 years', current: true, detail: 'Single-family, owned. Assessed $3.4M.', owned: true },
    { addr: '8534 Fountain Ave, West Hollywood, CA 90069', years: '2018–2022', current: false, detail: 'Apartment, rented.' },
    { addr: '3300 S Sepulveda Blvd, Unit 210, Los Angeles, CA 90034', years: '2015–2018', current: false, detail: 'Condo, rented.' },
  ],
  [
    { addr: '4421 Peachtree Rd NE, Unit 5B, Atlanta, GA 30319', years: '4 years', current: true, detail: 'Condo, rented.', owned: false },
    { addr: '2200 Howell Mill Rd NW, Atlanta, GA 30318', years: '2017–2020', current: false, detail: 'Apartment, rented.' },
  ],
  [
    { addr: '3129 N Damen Ave, Chicago, IL 60618', years: '6 years', current: true, detail: 'Two-flat, owned. Assessed $680,000.', owned: true },
    { addr: '1140 N Wells St, Apt 901, Chicago, IL 60610', years: '2014–2018', current: false, detail: 'Apartment, rented.' },
  ],
  [
    { addr: '211 Congress Ave, Unit 2204, Austin, TX 78701', years: '1 year', current: true, detail: 'Apartment, rented.', owned: false },
    { addr: '5500 Burnet Rd, Austin, TX 78756', years: '2020–2023', current: false, detail: 'Apartment, rented.' },
    { addr: '3401 Steck Ave, Austin, TX 78757', years: '2018–2020', current: false, detail: 'Single-family, rented.' },
  ],
];

function phoneSeed(phone: string): number {
  const d = phone.replace(/\D/g, '');
  return d.slice(-4).split('').reduce((a, c, i) => a + parseInt(c) * (i + 1), 0);
}

function getMockAddressData(phone?: string): AttomAddressResult {
  const s = phoneSeed(phone ?? '5000');
  const set = ADDRESS_SETS[Math.abs(s) % ADDRESS_SETS.length];
  return { addresses: set };
}
