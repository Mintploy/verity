// ATTOM Data Solutions - Property Intelligence
// Docs: https://api.gateway.attomdata.com/propertyapi/v1.0.0/

export interface AttomPropertyResult {
  address: string;
  ownerName?: string;
  ownerType?: string;
  purchasePrice?: string;
  purchaseDate?: string;
  yearsOwned?: string;
  currentValue?: string;
  estimatedRent?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
}

export interface AttomAddressResult {
  addresses: Array<{
    addr: string;
    years: string;
    current: boolean;
    detail: string;
    flag?: boolean;
    owned?: boolean;
  }>;
  propertyIntelligence?: AttomPropertyResult[];
}

function splitAddress(fullAddress: string): { address1: string; address2: string } {
  const parts = fullAddress.split(',');
  const address1 = (parts[0] ?? '').trim();
  const address2 = parts.slice(1).join(',').trim();
  return { address1, address2 };
}

async function fetchPropertyIntelligence(fullAddress: string, apiKey: string): Promise<AttomPropertyResult | null> {
  try {
    const { address1, address2 } = splitAddress(fullAddress);
    const params = `address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
    const headers = { 'apikey': apiKey, 'Accept': 'application/json' };

    const [detailRes, avmRes, rentalRes] = await Promise.allSettled([
      fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/saleshistory/detail?${params}`, { headers }),
      fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail?${params}`, { headers }),
      fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/valuation/rentalavm?${params}`, { headers }),
    ]);

    let ownerName: string | undefined;
    let ownerType: string | undefined;
    let purchasePrice: string | undefined;
    let purchaseDate: string | undefined;
    let yearsOwned: string | undefined;
    let propertyType: string | undefined;
    let beds: number | undefined;
    let baths: number | undefined;
    let sqft: number | undefined;
    let yearBuilt: number | undefined;

    if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
      const data = await detailRes.value.json();
      const prop = data.property?.[0];
      if (prop) {
        const owner = prop.assessment?.owner;
        ownerName = owner?.owner1?.lastName
          ? [owner.owner1.firstName, owner.owner1.lastName].filter(Boolean).join(' ')
          : owner?.corporateName ?? undefined;

        const ownerStr = (ownerName ?? '').toLowerCase();
        if (ownerStr.includes('trust') || ownerStr.includes('tr ')) ownerType = 'Trust';
        else if (ownerStr.includes('llc') || ownerStr.includes('corp') || ownerStr.includes('inc')) ownerType = 'LLC / Corporation';
        else ownerType = 'Individual';

        const sale = prop.saleHistory?.[0];
        if (sale?.amount?.saleAmt) {
          purchasePrice = `$${Number(sale.amount.saleAmt).toLocaleString()}`;
        }
        if (sale?.calculation?.recordingDate) {
          const d = new Date(sale.calculation.recordingDate);
          purchaseDate = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const years = new Date().getFullYear() - d.getFullYear();
          yearsOwned = years <= 1 ? 'Less than 1 year' : `${years} years`;
        }

        propertyType = prop.summary?.propType ?? undefined;
        beds = prop.building?.rooms?.beds ?? undefined;
        baths = prop.building?.rooms?.bathsTotal ?? undefined;
        sqft = prop.building?.size?.universalSize ?? undefined;
        yearBuilt = prop.summary?.yearBuilt ?? undefined;
      }
    }

    let currentValue: string | undefined;
    if (avmRes.status === 'fulfilled' && avmRes.value.ok) {
      const data = await avmRes.value.json();
      const avm = data.property?.[0]?.avm;
      if (avm?.amount?.value) {
        currentValue = `$${Number(avm.amount.value).toLocaleString()}`;
      }
    }

    let estimatedRent: string | undefined;
    if (rentalRes.status === 'fulfilled' && rentalRes.value.ok) {
      const data = await rentalRes.value.json();
      const rental = data.property?.[0]?.avm?.rentalAvm;
      if (rental?.value) {
        estimatedRent = `$${Number(rental.value).toLocaleString()}/mo`;
      }
    }

    if (!currentValue && !purchasePrice && !ownerName) return null;

    return { address: fullAddress, ownerName, ownerType, purchasePrice, purchaseDate, yearsOwned, currentValue, estimatedRent, propertyType, beds, baths, sqft, yearBuilt };
  } catch (e) {
    console.log('ATTOM_ERROR:', String(e));
    return null;
  }
}

export async function lookupAddress(name?: string, phone?: string, addresses?: string[]): Promise<AttomAddressResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.ATTOM_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_ATTOM_KEY' || !addresses?.length) {
    return getMockAddressData(phone);
  }

  try {
    const topAddresses = addresses.slice(0, 3);
    const results = await Promise.allSettled(
      topAddresses.map(addr => fetchPropertyIntelligence(addr, apiKey))
    );

    const propertyIntelligence = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean) as AttomPropertyResult[];

    console.log('ATTOM_PROPS_FOUND:', propertyIntelligence.length);

    return {
      addresses: addresses.map((addr, i) => ({
        addr,
        years: propertyIntelligence[i]?.yearsOwned ?? (i === 0 ? 'Current' : 'Previous'),
        current: i === 0,
        detail: propertyIntelligence[i]
          ? [propertyIntelligence[i].propertyType, propertyIntelligence[i].currentValue ? `Est. value ${propertyIntelligence[i].currentValue}` : null, propertyIntelligence[i].estimatedRent ? `Est. rent ${propertyIntelligence[i].estimatedRent}` : null].filter(Boolean).join(' · ')
          : 'Residential',
        owned: propertyIntelligence[i]?.ownerType !== undefined,
      })),
      propertyIntelligence,
    };
  } catch (e) {
    console.log('ATTOM_LOOKUP_ERROR:', String(e));
    return getMockAddressData(phone);
  }
}

const ADDRESS_SETS = [
  [
    { addr: '2847 Oak Canyon Dr, Scottsdale, AZ 85255', years: '3 years', current: true, detail: 'Single-family · Est. value $1.2M · Est. rent $4,800/mo', owned: false },
    { addr: '1205 N 68th St, Unit 4, Phoenix, AZ 85008', years: '2019–2021', current: false, detail: 'Apartment, rented.' },
    { addr: '9332 E Shea Blvd, Scottsdale, AZ 85260', years: '2016–2019', current: false, detail: 'Condo · Sold 2019 · $340,000.' },
  ],
  [
    { addr: '184 W 10th St, Apt 12C, New York, NY 10014', years: '5 years', current: true, detail: 'Apartment · Est. rent $6,200/mo', owned: false },
    { addr: '220 Riverside Blvd, Apt 8D, New York, NY 10069', years: '2016–2019', current: false, detail: 'Apartment, rented.' },
  ],
  [
    { addr: '1742 Mulholland Dr, Los Angeles, CA 90046', years: '2 years', current: true, detail: 'Single-family · Owned · Est. value $3.4M', owned: true },
    { addr: '8534 Fountain Ave, West Hollywood, CA 90069', years: '2018–2022', current: false, detail: 'Apartment, rented.' },
    { addr: '3300 S Sepulveda Blvd, Unit 210, Los Angeles, CA 90034', years: '2015–2018', current: false, detail: 'Condo, rented.' },
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
