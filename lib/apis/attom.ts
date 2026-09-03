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

const COMMERCIAL_TYPES = new Set(['COMM', 'COMML', 'RETAIL', 'OFFICE', 'IND', 'INDUSTRIAL', 'HOTEL', 'MOTEL', 'WAREHOUSE', 'MXD', 'SPECIAL']);
const RESIDENTIAL_TYPES = new Set(['SFR', 'CONDO', 'CONDOMINIUM', 'APT', 'APARTMENT', 'TWNHS', 'TOWNHOUSE', 'MFR', 'MH', 'MOBILEHOME', 'DUPLEX', 'TRIPLEX', 'QUADPLEX', 'COOPERATIVE']);

function classifyPropertyType(raw: string): string {
  const upper = raw.toUpperCase().replace(/[\s_-]/g, '');
  if (COMMERCIAL_TYPES.has(upper)) return `Commercial — ${raw}`;
  if (RESIDENTIAL_TYPES.has(upper)) {
    const labels: Record<string, string> = { SFR: 'Single-family home', CONDO: 'Condominium', CONDOMINIUM: 'Condominium', APT: 'Apartment', TWNHS: 'Townhouse', MH: 'Mobile home', DUPLEX: 'Duplex', TRIPLEX: 'Triplex', COOPERATIVE: 'Co-op' };
    return labels[upper] ?? raw;
  }
  return raw || 'Residential';
}

function splitAddress(fullAddress: string): { address1: string; address2: string } {
  const parts = fullAddress.split(',');
  if (parts.length >= 3) {
    const address1 = (parts[0] ?? '').trim();
    const address2 = parts.slice(1).join(',').trim();
    return { address1, address2 };
  }
  if (parts.length === 2) {
    const address1 = (parts[0] ?? '').trim();
    const address2 = (parts[1] ?? '').trim();
    return { address1, address2 };
  }
  // Single string — try to split on last two words as city state
  const words = fullAddress.trim().split(' ');
  const address1 = words.slice(0, -2).join(' ');
  const address2 = words.slice(-2).join(' ');
  return { address1, address2 };
}

async function fetchPropertyIntelligence(fullAddress: string, apiKey: string): Promise<AttomPropertyResult | null> {
  try {
    const { address1, address2 } = splitAddress(fullAddress);
    const params = `address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
    console.log('ATTOM_ADDR:', address1, '|', address2);
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
          yearsOwned = `Since ${purchaseDate}`;
        }

        const rawPropType: string = prop.summary?.propSubType ?? prop.summary?.propType ?? '';
        propertyType = classifyPropertyType(rawPropType);
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

// enrichHistorical: founding/annual members only — looks up up to 3 addresses.
// Default (false): current address only — 3 ATTOM calls instead of 9.
export async function lookupAddress(name?: string, phone?: string, addresses?: string[], enrichHistorical = false): Promise<AttomAddressResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.ATTOM_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_ATTOM_KEY' || !addresses?.length) {
    return { addresses: [], propertyIntelligence: [] };
  }

  try {
    const limit = enrichHistorical ? 3 : 1;
    const topAddresses = addresses.slice(0, limit);
    const results = await Promise.allSettled(
      topAddresses.map(addr => fetchPropertyIntelligence(addr, apiKey))
    );

    // Keep nulls to preserve index alignment — don't filter here
    const propByIndex: (AttomPropertyResult | null)[] = results
      .map(r => r.status === 'fulfilled' ? r.value : null);

    const propertyIntelligence = propByIndex.filter(Boolean) as AttomPropertyResult[];
    console.log('ATTOM_PROPS_FOUND:', propertyIntelligence.length);

    return {
      addresses: addresses.map((addr, i) => ({
        addr,
        years: propByIndex[i]?.yearsOwned ?? propByIndex[i]?.purchaseDate ?? (i === 0 ? 'Current' : 'Previous address'),
        current: i === 0,
        detail: propByIndex[i]
          ? [propByIndex[i]!.propertyType, propByIndex[i]!.currentValue ? `Est. value ${propByIndex[i]!.currentValue}` : null, propByIndex[i]!.estimatedRent ? `Est. rent ${propByIndex[i]!.estimatedRent}` : null].filter(Boolean).join(' · ')
          : 'Residential',
        owned: propByIndex[i]?.ownerType !== undefined,
      })),
      propertyIntelligence,
    };
  } catch (e) {
    console.log('ATTOM_LOOKUP_ERROR:', String(e));
    return { addresses: [], propertyIntelligence: [] };
  }
}
