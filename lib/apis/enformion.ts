// Enformion — comprehensive people intelligence API
// Auth: galaxy-ap-name / galaxy-ap-password headers + galaxy-search-type
// Env vars: ENFORMION_USERNAME (galaxy-ap-name), ENFORMION_PASSWORD (galaxy-ap-password)
// Base endpoint: POST https://devapi.enformion.com/PersonSearch

const BASE_URL = 'https://devapi.enformion.com/PersonSearch';
const PROPERTY_URL = 'https://devapi.enformion.com/PropertyV2Search';
const DIVORCE_URL = 'https://devapi.enformion.com/DivorceSearch';
const PHONE_URL = 'https://devapi.enformion.com/ReversePhoneSearch';
const LINKEDIN_URL = 'https://devapi.enformion.com/LinkedIn/Id';
const CENSUS_URL = 'https://devapi.enformion.com/CensusSearch';

// galaxy-search-type values
const SEARCH_TYPE_PERSON = 'ReversePhonePerson';
const SEARCH_TYPE_PHONE = 'ReversePhone';
const SEARCH_TYPE_PROPERTY = 'PropertyV2';
const SEARCH_TYPE_DIVORCE = 'Divorce';
const SEARCH_TYPE_LINKEDIN = 'LinkedIn';
const SEARCH_TYPE_CENSUS = 'Census';

export interface EnformionPhone {
  lineType: 'mobile' | 'voip' | 'landline';
  carrier?: string;
  voipFlag?: string;
  origin: string;
  active: boolean;
}

export interface EnformionAddress {
  addr: string;
  years: string;
  current: boolean;
  detail: string;
  flag?: boolean;
}

export interface EnformionProperty {
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

export interface EnformionPerson {
  tahoeId?: string;
  fullName?: string;
  age?: number;
  dob?: string;
  aliases?: string[];
  addresses?: EnformionAddress[];
  relatives?: string[];
  associates?: string[];
  emails?: string[];
  jobTitle?: string;
  company?: string;
  additionalPhones?: string[];
  maritalStatus?: string;
  spouseName?: string;
  priorMarriages?: string;
  propertyIntelligence?: EnformionProperty[];
  // Indicator flags (count > 0 means records exist; details via separate lookup)
  hasBankruptcy?: boolean;
  hasEvictions?: boolean;
  hasForeclosures?: boolean;
  hasJudgments?: boolean;
  hasLiens?: boolean;
  hasBusinessRecords?: boolean;
  hasDivorceRecords?: boolean;
  hasPropertyRecords?: boolean;
  linkedInUrl?: string;
  linkedInHeadline?: string;
  censusNeighborhood?: string;
}

export interface EnformionResult {
  phone: EnformionPhone;
  person: EnformionPerson;
}

function classifyLineType(raw: string): 'mobile' | 'voip' | 'landline' {
  const t = raw.toLowerCase();
  if (t.includes('voip')) return 'voip';
  if (t.includes('wireless')) return 'mobile';
  if (t.includes('landline') || t.includes('land line') || t.includes('services')) return 'landline';
  return 'mobile';
}

function buildName(obj: { firstName?: string; middleName?: string; lastName?: string }): string {
  return [obj.firstName, obj.middleName, obj.lastName].filter(Boolean).join(' ');
}

function birthYearToApproxAge(dobStr: string): number | null {
  // Enformion DOB format: "1/XX/1964" — only year is reliable
  const parts = dobStr.split('/');
  const year = parseInt(parts[parts.length - 1]);
  if (!year || year < 1900) return null;
  return new Date().getFullYear() - year;
}

function makeHeaders(username: string, password: string, searchType: string) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'galaxy-ap-name': username,
    'galaxy-ap-password': password,
    'galaxy-search-type': searchType,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export async function lookupEnformion(phone: string, name?: string): Promise<EnformionResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const username = process.env.ENFORMION_USERNAME;
  const password = process.env.ENFORMION_PASSWORD;

  if (!liveAllowed || !username || !password) {
    return { phone: emptyPhone(), person: {} };
  }

  const cleaned = phone.replace(/\D/g, '');

  try {
    const body: Record<string, unknown> = {
      Phone: cleaned,
      Includes: [
        'AKAs',
        'Addresses',
        'PhoneNumbers',
        'EmailAddresses',
        'DateOfBirth',
        'DateOfDeath',
        'DeathRecords',
        'WorkplaceSummary',
        'RelativesSummary',
        'AssociatesSummary',
        'Indicators',
      ],
      FilterOptions: ['IncludeLowQualityAddresses'],
      ResultsPerPage: 5,
    };
    if (name) {
      const parts = name.trim().split(' ');
      body.FirstName = parts[0];
      body.LastName = parts.slice(1).join(' ');
    }

    console.log('ENFORMION_REQUEST:', JSON.stringify(body));
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: makeHeaders(username, password, SEARCH_TYPE_PERSON),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    console.log('ENFORMION_STATUS:', res.status);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log('ENFORMION_ERROR_BODY:', errText.slice(0, 500));
      return { phone: emptyPhone(), person: {} };
    }

    const data = await res.json();
    const results: any[] = data.results ?? [];
    console.log('ENFORMION_RESULTS:', results.length);
    if (!results.length) return { phone: emptyPhone(), person: {} };

    // ReversePhonePerson ranking puts best match first
    const best = results[0];

    // --- Phone intelligence ---
    const phoneNumbers: any[] = best.phoneNumbers ?? [];
    const matchedPhone = phoneNumbers.find(
      (p: any) => (p.phoneNumber ?? '').replace(/\D/g, '') === cleaned
    ) ?? phoneNumbers.sort((a: any, b: any) => (a.phoneOrder ?? 999) - (b.phoneOrder ?? 999))[0];

    const rawLineType = matchedPhone?.phoneType ?? '';
    const lineType = classifyLineType(rawLineType);

    const phoneResult: EnformionPhone = {
      lineType,
      carrier: matchedPhone?.company ?? undefined,
      voipFlag: lineType === 'voip'
        ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.'
        : undefined,
      origin: 'United States',
      active: !(best.deathRecords?.isDeceased ?? false),
    };

    // --- Identity ---
    const fullName: string | undefined = best.fullName
      ?? (best.name ? buildName(best.name) : undefined);
    const age: number | undefined = best.age ?? undefined;

    // With DateOfBirth include enabled, datesOfBirth may now have actual dates
    const dobRecord = (best.datesOfBirth ?? [])[0];
    const dobRaw: string | undefined = (best.dob && best.dob !== '')
      ? best.dob
      : dobRecord?.dob ?? dobRecord?.DateOfBirth ?? dobRecord?.dateOfBirth ?? undefined;

    const aliases: string[] = (best.akas ?? [])
      .map((a: any) => buildName(a))
      .filter(Boolean)
      .filter((n: string) => n !== fullName);

    // --- Addresses ---
    const rawAddresses: any[] = best.addresses ?? [];
    const sortedAddresses = [...rawAddresses]
      .sort((a: any, b: any) => (a.addressOrder ?? 999) - (b.addressOrder ?? 999))
      .slice(0, 8);

    const addresses: EnformionAddress[] = sortedAddresses.map((a: any, i: number) => {
      const addr = a.fullAddress ?? '';
      const isCurrent = i === 0;
      const fromRaw = a.firstReportedDate ?? null;
      const toRaw = a.lastReportedDate ?? null;
      let years = isCurrent ? 'Current' : 'Previous address';
      if (fromRaw) {
        const fromYear = new Date(fromRaw).getFullYear();
        if (isCurrent) {
          years = `Since ${fromYear}`;
        } else if (toRaw) {
          const toYear = new Date(toRaw).getFullYear();
          years = fromYear === toYear ? String(fromYear) : `${fromYear}–${toYear}`;
        } else {
          years = `From ${fromYear}`;
        }
      }
      return {
        addr,
        years,
        current: isCurrent,
        detail: isCurrent ? 'Current address' : 'Previous address',
        flag: !!(a.highRiskMarker?.isHighRisk),
      };
    }).filter((a: any) => a.addr);

    // --- Employment (WorkplaceSummary include) ---
    const workplaces: any[] = best.workplaceSummary ?? best.WorkplaceSummary ?? [];
    const currentJob = workplaces.find(
      (w: any) => w.isCurrent ?? w.IsCurrent ?? w.is_current
    ) ?? workplaces[0];
    const jobTitle: string | undefined = currentJob?.position ?? currentJob?.Position
      ?? currentJob?.title ?? currentJob?.Title ?? currentJob?.jobTitle ?? undefined;
    const company: string | undefined = currentJob?.employer ?? currentJob?.Employer
      ?? currentJob?.company ?? currentJob?.Company ?? undefined;

    // --- Relatives + spouse detection ---
    const relativesSummary: any[] = best.relativesSummary ?? [];

    const currentSpouse = relativesSummary.find(
      (r: any) => r.spouse === 1 && !r.oldSpouse && !r.isDeceased
    );
    const spouseName: string | undefined = currentSpouse ? buildName(currentSpouse) : undefined;

    const priorSpouses = relativesSummary.filter((r: any) => r.oldSpouse === true);
    const priorMarriages: string | undefined = priorSpouses.length > 0
      ? `${priorSpouses.length} prior marriage${priorSpouses.length !== 1 ? 's' : ''} on record`
      : undefined;

    const maritalStatus: string | undefined = spouseName
      ? 'Married'
      : priorSpouses.length > 0
        ? 'Divorced / previously married'
        : undefined;

    const relatives: string[] = relativesSummary
      .filter((r: any) => r.spouse !== 1)
      .slice(0, 10)
      .map((r: any) => {
        const rName = buildName(r);
        const approxAge = r.dob ? birthYearToApproxAge(r.dob) : null;
        return approxAge ? `${rName} (approx. ${approxAge})` : rName;
      })
      .filter(Boolean);

    // --- Associates ---
    const associates: string[] = (best.associatesSummary ?? [])
      .slice(0, 8)
      .map((a: any) => buildName(a))
      .filter(Boolean);

    // --- Additional phones ---
    const additionalPhones: string[] = phoneNumbers
      .filter((p: any) => (p.phoneNumber ?? '').replace(/\D/g, '') !== cleaned)
      .sort((a: any, b: any) => (a.phoneOrder ?? 999) - (b.phoneOrder ?? 999))
      .slice(0, 3)
      .map((p: any) => `${p.phoneNumber} (${p.phoneType ?? 'unknown'})`);

    // --- Emails (personal only) ---
    const emails: string[] = (best.emailAddresses ?? [])
      .filter((e: any) => e.nonBusiness === 1)
      .map((e: any) => e.emailAddress)
      .filter((e: any) => typeof e === 'string' && e.includes('@'))
      .slice(0, 3);

    // --- Indicators ---
    const indicators = best.indicators ?? {};
    const hasBankruptcy = (indicators.hasBankruptcyRecords ?? 0) > 0;
    const hasEvictions = (indicators.hasEvictionsRecords ?? 0) > 0;
    const hasForeclosures = (indicators.hasForeclosuresRecords ?? 0) > 0;
    const hasJudgments = (indicators.hasJudgmentRecords ?? 0) > 0;
    const hasLiens = (indicators.hasLienRecords ?? 0) > 0;
    const hasBusinessRecords = (indicators.hasBusinessRecords ?? 0) > 0;
    const hasDivorceRecords = (indicators.hasDivorceRecords ?? 0) > 0;
    const hasPropertyRecords = (indicators.hasPropertyV2Records ?? indicators.hasPropertyRecords ?? 0) > 0;

    // --- Secondary lookups (parallel) ---
    const [propertyIntelligence, divorceDetail, linkedInResult, censusResult] = await Promise.all([
      lookupPropertyV2(username, password, best.tahoeId, addresses[0]?.addr, fullName).catch(() => []),
      hasDivorceRecords
        ? lookupDivorce(username, password, best.tahoeId, fullName).catch(() => null)
        : Promise.resolve(null),
      best.tahoeId
        ? lookupLinkedIn(username, password, best.tahoeId).catch(() => null)
        : Promise.resolve(null),
      addresses[0]?.addr
        ? lookupCensus(username, password, addresses[0].addr).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      phone: phoneResult,
      person: {
        tahoeId: best.tahoeId,
        fullName,
        age,
        dob: dobRaw,
        aliases,
        addresses,
        relatives,
        associates,
        emails,
        jobTitle,
        company,
        additionalPhones,
        maritalStatus,
        spouseName,
        priorMarriages: divorceDetail ?? priorMarriages,
        propertyIntelligence,
        hasBankruptcy,
        hasEvictions,
        hasForeclosures,
        hasJudgments,
        hasLiens,
        hasBusinessRecords,
        hasDivorceRecords,
        hasPropertyRecords,
        linkedInUrl: linkedInResult?.url,
        linkedInHeadline: linkedInResult?.headline,
        censusNeighborhood: censusResult?.neighborhood,
      },
    };
  } catch (e: any) {
    const cause = e?.cause ?? e?.reason;
    console.log('ENFORMION_ERROR:', String(e), cause ? `| cause: ${String(cause)}` : '');
    return { phone: emptyPhone(), person: {} };
  }
}

async function lookupPropertyV2(
  username: string,
  password: string,
  tahoeId?: string,
  currentAddress?: string,
  fullName?: string,
): Promise<EnformionProperty[]> {
  if (!tahoeId && !currentAddress) return [];

  const body: Record<string, unknown> = { ResultsPerPage: 3 };
  if (tahoeId) {
    body.TahoeId = tahoeId;
  } else if (currentAddress && fullName) {
    const nameParts = fullName.trim().split(' ');
    body.FirstName = nameParts[0];
    body.LastName = nameParts.slice(1).join(' ');
    // Split address into line1 / line2 at the city boundary (after first comma)
    const commaIdx = currentAddress.indexOf(';');
    body.AddressLine1 = commaIdx > -1 ? currentAddress.slice(0, commaIdx).trim() : currentAddress;
    body.AddressLine2 = commaIdx > -1 ? currentAddress.slice(commaIdx + 1).trim() : '';
  }

  const res = await fetch(PROPERTY_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_PROPERTY),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  console.log('ENFORMION_PROPERTY_STATUS:', res.status);
  if (!res.ok) return [];

  const data = await res.json();
  const results: any[] = data.results ?? data.Results ?? [];
  console.log('ENFORMION_PROPERTY_RESULTS:', results.length);

  return results.slice(0, 4).map((p: any) => {
    const addr = p.fullAddress ?? p.FullAddress
      ?? [p.addressLine1 ?? p.AddressLine1, p.addressLine2 ?? p.AddressLine2].filter(Boolean).join(', ');
    const purchaseDateRaw = p.saleDate ?? p.SaleDate ?? p.purchaseDate ?? p.PurchaseDate;
    const purchaseDate = purchaseDateRaw
      ? new Date(purchaseDateRaw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : undefined;
    const saleAmt = p.saleAmount ?? p.SaleAmount ?? p.purchasePrice ?? p.PurchasePrice;
    const avm = p.estimatedValue ?? p.EstimatedValue ?? p.avm ?? p.AVM;
    const rent = p.estimatedRent ?? p.EstimatedRent;
    const ownerName = p.ownerName ?? p.OwnerName ?? p.owner ?? p.Owner;
    const rawType = p.propertyType ?? p.PropertyType ?? p.landUse ?? p.LandUse ?? '';
    return {
      address: addr,
      ownerName,
      purchasePrice: saleAmt ? `$${Number(saleAmt).toLocaleString()}` : undefined,
      purchaseDate,
      yearsOwned: purchaseDate ? `Since ${purchaseDate}` : undefined,
      currentValue: avm ? `$${Number(avm).toLocaleString()}` : undefined,
      estimatedRent: rent ? `$${Number(rent).toLocaleString()}/mo` : undefined,
      propertyType: rawType || undefined,
      beds: p.bedrooms ?? p.Bedrooms ?? p.beds ?? undefined,
      baths: p.bathrooms ?? p.Bathrooms ?? p.baths ?? undefined,
      sqft: p.squareFeet ?? p.SquareFeet ?? p.sqft ?? undefined,
      yearBuilt: p.yearBuilt ?? p.YearBuilt ?? undefined,
    };
  }).filter((p: any) => p.address);
}

async function lookupLinkedIn(
  username: string,
  password: string,
  tahoeId: string,
): Promise<{ url?: string; headline?: string } | null> {
  const res = await fetch(LINKEDIN_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_LINKEDIN),
    body: JSON.stringify({ TahoeId: tahoeId }),
    signal: AbortSignal.timeout(10000),
  });

  console.log('ENFORMION_LINKEDIN_STATUS:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = data.results ?? data.Results ?? [];
  if (!results.length) return null;

  const r = results[0];
  const url = r.linkedInUrl ?? r.LinkedInUrl ?? r.url ?? r.URL ?? r.profileUrl ?? r.ProfileUrl;
  const headline = r.headline ?? r.Headline ?? r.title ?? r.Title ?? r.jobTitle ?? r.JobTitle;

  console.log('ENFORMION_LINKEDIN_FOUND:', !!url);
  return { url, headline };
}

async function lookupCensus(
  username: string,
  password: string,
  address: string,
): Promise<{ neighborhood?: string } | null> {
  const commaIdx = address.indexOf(';');
  const body: Record<string, unknown> = {
    AddressLine1: commaIdx > -1 ? address.slice(0, commaIdx).trim() : address,
    AddressLine2: commaIdx > -1 ? address.slice(commaIdx + 1).trim() : '',
    ResultsPerPage: 1,
  };

  const res = await fetch(CENSUS_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_CENSUS),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  console.log('ENFORMION_CENSUS_STATUS:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = data.results ?? data.Results ?? [];
  if (!results.length) return null;

  const r = results[0];
  const neighborhood = r.neighborhood ?? r.Neighborhood ?? r.tract ?? r.Tract
    ?? r.censusBlock ?? r.CensusBlock ?? r.area ?? r.Area;

  return { neighborhood };
}

async function lookupDivorce(
  username: string,
  password: string,
  tahoeId?: string,
  fullName?: string,
): Promise<string | null> {
  if (!tahoeId && !fullName) return null;

  const body: Record<string, unknown> = { ResultsPerPage: 3 };
  if (tahoeId) {
    body.TahoeId = tahoeId;
  } else if (fullName) {
    const parts = fullName.trim().split(' ');
    body.FirstName = parts[0];
    body.LastName = parts.slice(1).join(' ');
  }

  const res = await fetch(DIVORCE_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_DIVORCE),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  console.log('ENFORMION_DIVORCE_STATUS:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = data.results ?? data.Results ?? [];
  console.log('ENFORMION_DIVORCE_RESULTS:', results.length);
  if (!results.length) return null;

  const r = results[0];
  const year = r.divorceDate ?? r.DivorceDate ?? r.filingDate ?? r.FilingDate;
  const county = r.county ?? r.County ?? r.jurisdiction ?? r.Jurisdiction;
  const parts = [year ? new Date(year).getFullYear() : null, county].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Divorce record on file';
}

function emptyPhone(): EnformionPhone {
  return { lineType: 'mobile', origin: '—', active: true };
}
