// Enformion — comprehensive people intelligence API
// Replaces Whitepages (identity/phone) + ATTOM (property) + OpenCorporates (business)
// Docs: https://docs.enformion.com
// Auth: HTTP Basic Auth — ENFORMION_USERNAME + ENFORMION_PASSWORD

export interface EnformionPhone {
  lineType: 'mobile' | 'voip' | 'landline';
  voipFlag?: string;
  origin: string;
  active: boolean;
}

export interface EnformionAddress {
  addr: string;
  years: string;
  current: boolean;
  detail: string;
  owned?: boolean;
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
  fullName?: string;
  age?: number;
  dob?: string;
  aliases?: string[];
  addresses?: EnformionAddress[];
  relatives?: string[];
  associates?: string[];
  emails?: string[];
  company?: string;
  jobTitle?: string;
  additionalPhones?: string[];
  maritalStatus?: string;
  spouseName?: string;
  priorMarriages?: string;
  licenses?: string;
  businessEntities?: string;
  criminal?: string;
  bankruptcy?: string;
  evictions?: string;
  propertyIntelligence?: EnformionProperty[];
}

export interface EnformionResult {
  phone: EnformionPhone;
  person: EnformionPerson;
}

function classifyLineType(raw: string): 'mobile' | 'voip' | 'landline' {
  const t = raw.toLowerCase();
  if (t.includes('voip') || t.includes('virtual') || t.includes('google') || t.includes('nonfix')) return 'voip';
  if (t.includes('mobile') || t.includes('wireless') || t.includes('cell')) return 'mobile';
  return 'landline';
}

function classifyOwnerType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('trust') || n.includes(' tr ')) return 'Trust';
  if (n.includes('llc') || n.includes('corp') || n.includes('inc') || n.includes('ltd')) return 'LLC / Corporation';
  return 'Individual';
}

function classifyPropertyType(raw: string): string {
  const u = raw.toUpperCase().replace(/[\s_-]/g, '');
  const labels: Record<string, string> = {
    SFR: 'Single-family home', SINGLEFAMILY: 'Single-family home',
    CONDO: 'Condominium', CONDOMINIUM: 'Condominium',
    TWNHS: 'Townhouse', TOWNHOUSE: 'Townhouse',
    APT: 'Apartment', APARTMENT: 'Apartment', MFR: 'Multi-family',
    MH: 'Mobile home', DUPLEX: 'Duplex', COOPERATIVE: 'Co-op',
  };
  const commercialTypes = new Set(['COMM', 'COMML', 'RETAIL', 'OFFICE', 'IND', 'INDUSTRIAL', 'WAREHOUSE', 'HOTEL']);
  if (commercialTypes.has(u)) return `Commercial — ${raw}`;
  return labels[u] ?? (raw || 'Residential');
}

function parseDob(raw: string): string {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const parts = raw.split(/[-\/]/);
  if (parts.length < 2) return raw;
  // Handle MM/DD/YYYY or YYYY-MM-DD
  const isYearFirst = parts[0].length === 4;
  const year = isYearFirst ? parts[0] : parts[2];
  const monthIdx = parseInt(isYearFirst ? parts[1] : parts[0]) - 1;
  const day = isYearFirst ? (parts[2] && parts[2] !== '00' ? parseInt(parts[2]) : null) : (parts[1] && parts[1] !== '00' ? parseInt(parts[1]) : null);
  const month = MONTHS[monthIdx] ?? '';
  return day ? `${month} ${day}, ${year}` : `${month} ${year}`;
}

export async function lookupEnformion(phone: string, name?: string): Promise<EnformionResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const username = process.env.ENFORMION_USERNAME;
  const password = process.env.ENFORMION_PASSWORD;

  if (!liveAllowed || !username || !password) {
    return { phone: emptyPhone(), person: {} };
  }

  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const cleaned = phone.replace(/\D/g, '');

  try {
    // Person search by phone (and name if provided)
    const body: Record<string, string> = { Phone: cleaned };
    if (name) {
      const parts = name.trim().split(' ');
      body.FirstName = parts[0];
      body.LastName = parts.slice(1).join(' ');
    }

    const res = await fetch('https://gw.enformion.com/1.0/person/search', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log('ENFORMION_STATUS:', res.status);
    if (!res.ok) return { phone: emptyPhone(), person: {} };

    const data = await res.json();
    console.log('ENFORMION_RESULTS:', data.Results?.length ?? 0);

    const results: any[] = data.Results ?? data.records ?? data.persons ?? [];
    if (!results.length) return { phone: emptyPhone(), person: {} };

    // Best match: highest score, or first result
    const best = results.sort((a: any, b: any) => (b.Score ?? b.score ?? 0) - (a.Score ?? a.score ?? 0))[0];

    // --- Phone intelligence ---
    const phones: any[] = best.Phones ?? best.phones ?? [];
    const matchedPhone = phones.find((p: any) => (p.Number ?? p.number ?? '').replace(/\D/g, '') === cleaned) ?? phones[0];
    const rawLineType = matchedPhone?.PhoneType ?? matchedPhone?.LineType ?? matchedPhone?.type ?? '';
    const lineType = classifyLineType(rawLineType);

    const phoneResult: EnformionPhone = {
      lineType,
      voipFlag: lineType === 'voip' ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.' : undefined,
      origin: (matchedPhone?.CountryCode ?? '1') === '1' ? 'United States' : 'International',
      active: !(best.IsDeceased ?? best.Deceased ?? false),
    };

    // --- Identity ---
    const nameRecord = (best.Names ?? best.names ?? [])[0] ?? {};
    const fullName = nameRecord.FullName ?? nameRecord.full_name
      ?? [nameRecord.FirstName ?? nameRecord.first_name, nameRecord.MiddleName, nameRecord.LastName ?? nameRecord.last_name].filter(Boolean).join(' ')
      ?? best.Name ?? best.name ?? undefined;

    const dobRaw = (best.DOBs ?? best.dobs ?? [])[0]?.DateOfBirth ?? (best.DOBs ?? best.dobs ?? [])[0]?.DOB ?? best.DOB ?? best.dob ?? undefined;
    const dob = dobRaw ? parseDob(String(dobRaw)) : undefined;
    const age = best.Age ?? best.age ?? (best.DOBs ?? [])[0]?.Age ?? undefined;

    const aliases: string[] = (best.AKAs ?? best.akas ?? best.Aliases ?? best.aliases ?? [])
      .map((a: any) => a.FullName ?? a.Name ?? a.name ?? a).filter(Boolean);

    // --- Addresses ---
    const rawAddresses: any[] = best.Addresses ?? best.addresses ?? [];
    const addresses: EnformionAddress[] = rawAddresses.map((a: any, i: number) => {
      const street = a.StreetAddress ?? a.Address1 ?? a.street ?? '';
      const city = a.City ?? a.city ?? '';
      const state = a.State ?? a.state ?? '';
      const zip = a.Zip ?? a.ZipCode ?? a.zip ?? '';
      const addr = a.FullAddress ?? a.full_address ?? [street, city, state, zip].filter(Boolean).join(', ');
      const isCurrent = a.IsCurrent ?? a.is_current ?? a.Current ?? (i === 0);
      const dateFrom = a.DateFirstSeen ?? a.FirstSeen ?? a.date_from ?? null;
      const dateTo = a.DateLastSeen ?? a.LastSeen ?? a.date_to ?? null;
      let years = isCurrent ? 'Current' : 'Previous address';
      if (dateFrom) {
        const fromYear = new Date(dateFrom).getFullYear();
        years = isCurrent ? `Since ${fromYear}` : dateTo ? `${fromYear}–${new Date(dateTo).getFullYear()}` : `From ${fromYear}`;
      }
      const propType = a.PropertyType ?? a.property_type ?? '';
      return {
        addr, years, current: !!isCurrent,
        detail: propType ? classifyPropertyType(propType) : (isCurrent ? 'Residential' : 'Previous address'),
        owned: !!(a.Owned ?? a.owned ?? false),
      };
    }).filter(a => a.addr);

    // --- Relatives ---
    const relatives: string[] = (best.Relatives ?? best.relatives ?? []).map((r: any) => {
      const parts: string[] = [];
      const rName = r.FullName ?? r.Name ?? r.name ?? [r.FirstName, r.LastName].filter(Boolean).join(' ');
      if (rName) parts.push(rName);
      if (r.Age ?? r.age) parts.push(`age ${r.Age ?? r.age}`);
      const rPhone = (r.Phones ?? r.phones ?? [])[0]?.Number;
      if (rPhone) parts.push(rPhone);
      const rAddr = (r.Addresses ?? r.addresses ?? [])[0];
      if (rAddr?.City && rAddr?.State) parts.push(`${rAddr.City}, ${rAddr.State}`);
      return parts.join(' · ');
    }).filter(Boolean);

    // --- Associates ---
    const associates: string[] = (best.Associates ?? best.associates ?? []).map((a: any) => {
      const aName = a.FullName ?? a.Name ?? a.name ?? [a.FirstName, a.LastName].filter(Boolean).join(' ');
      const aPhone = (a.Phones ?? a.phones ?? [])[0]?.Number;
      return [aName, aPhone].filter(Boolean).join(' · ');
    }).filter(Boolean);

    // --- Additional phones ---
    const additionalPhones: string[] = phones
      .filter((p: any) => (p.Number ?? '').replace(/\D/g, '') !== cleaned)
      .map((p: any) => `${p.Number ?? p.number} (${p.PhoneType ?? p.type ?? 'unknown'})`)
      .slice(0, 3);

    // --- Employment ---
    const employments: any[] = best.Employments ?? best.employments ?? best.Employment ?? [];
    const currentJob = employments.find((e: any) => e.IsCurrent ?? e.is_current ?? e.Current) ?? employments[0];
    const jobTitle = currentJob?.Title ?? currentJob?.JobTitle ?? currentJob?.title ?? best.JobTitle ?? best.job_title ?? undefined;
    const company = currentJob?.Employer ?? currentJob?.Company ?? currentJob?.employer ?? best.Employer ?? best.employer ?? undefined;

    // --- Business entities ---
    const businesses: any[] = best.Businesses ?? best.businesses ?? best.BusinessAffiliations ?? [];
    const businessLines = businesses.map((b: any) => {
      const bName = b.Name ?? b.BusinessName ?? b.name;
      const role = b.Role ?? b.Position ?? b.role;
      const state = b.State ?? b.state;
      const status = b.Status ?? b.status;
      return [bName, role, state, status ? `(${status})` : null].filter(Boolean).join(' · ');
    }).filter(Boolean);
    const businessEntities = businessLines.length ? businessLines.join('\n') : undefined;

    // --- Marital status ---
    const maritalStatus: string | undefined = best.MaritalStatus ?? best.marital_status ?? undefined;
    const spouseRecord = (best.Relatives ?? best.relatives ?? [])
      .find((r: any) => (r.Relationship ?? r.relation ?? '').toLowerCase() === 'spouse');
    const spouseName: string | undefined = spouseRecord
      ? (spouseRecord.FullName ?? spouseRecord.Name ?? [spouseRecord.FirstName, spouseRecord.LastName].filter(Boolean).join(' '))
      : undefined;

    // Prior marriages
    const divorceDates: string[] = best.DivorceDates ?? best.divorce_dates ?? [];
    const marriageDates: string[] = best.MarriageDates ?? best.marriage_dates ?? [];
    let priorMarriages: string | undefined;
    if (divorceDates.length > 0) {
      const years = divorceDates.map((d: string) => new Date(d).getFullYear()).join(', ');
      priorMarriages = divorceDates.length === 1 ? `1 prior marriage · divorced ${years}` : `${divorceDates.length} prior marriages · divorced ${years}`;
    } else if (marriageDates.length > 1) {
      priorMarriages = `${marriageDates.length - 1} prior marriage(s) on record`;
    } else if (maritalStatus === 'Divorced' || maritalStatus === 'Separated') {
      priorMarriages = 'At least 1 (currently divorced)';
    } else if (maritalStatus === 'Widowed') {
      priorMarriages = 'At least 1 (widowed)';
    }

    // --- Professional licenses ---
    const licenseList: any[] = best.Licenses ?? best.licenses ?? best.ProfessionalLicenses ?? [];
    const licenses = licenseList.length
      ? licenseList.map((l: any) => [l.Type ?? l.type, l.State ?? l.state, l.Status ? `(${l.Status})` : null].filter(Boolean).join(' · ')).join('; ')
      : undefined;

    // --- Criminal records ---
    const criminalRecs: any[] = best.CriminalRecords ?? best.criminal_records ?? best.Criminals ?? [];
    let criminal: string | undefined;
    if (criminalRecs.length > 0) {
      const summaries = criminalRecs.map((c: any) => {
        const charge = c.Charge ?? c.OffenseDescription ?? c.offense ?? c.description ?? c.type;
        const disposition = c.Disposition ?? c.disposition;
        const year = c.OffenseDate ?? c.Date ?? c.date ? new Date(c.OffenseDate ?? c.Date ?? c.date).getFullYear() : null;
        const state = c.State ?? c.state;
        return [charge, disposition, year, state].filter(Boolean).join(' · ');
      }).filter(Boolean);
      criminal = summaries.join('; ') || `${criminalRecs.length} record${criminalRecs.length !== 1 ? 's' : ''} found`;
    }

    // --- Bankruptcy ---
    const bankruptcyRecs: any[] = best.Bankruptcies ?? best.bankruptcies ?? best.BankruptcyRecords ?? [];
    let bankruptcy: string | undefined;
    if (bankruptcyRecs.length > 0) {
      const summaries = bankruptcyRecs.map((b: any) => {
        const chapter = b.Chapter ? `Chapter ${b.Chapter}` : b.Type ?? b.type;
        const year = b.FilingDate ?? b.filing_date ? new Date(b.FilingDate ?? b.filing_date).getFullYear() : null;
        const disposition = b.Disposition ?? b.Status ?? b.status;
        return [chapter, disposition, year].filter(Boolean).join(' · ');
      }).filter(Boolean);
      bankruptcy = summaries.join('; ') || `${bankruptcyRecs.length} filing${bankruptcyRecs.length !== 1 ? 's' : ''} found`;
    }

    // --- Evictions ---
    const evictionRecs: any[] = best.Evictions ?? best.evictions ?? best.EvictionRecords ?? [];
    let evictions: string | undefined;
    if (evictionRecs.length > 0) {
      const summaries = evictionRecs.map((e: any) => {
        const year = e.FilingDate ?? e.filing_date ? new Date(e.FilingDate ?? e.filing_date).getFullYear() : null;
        const disposition = e.Disposition ?? e.Status ?? e.status;
        const state = e.State ?? e.state;
        return [year, disposition, state].filter(Boolean).join(' · ');
      }).filter(Boolean);
      evictions = summaries.join('; ') || `${evictionRecs.length} filing${evictionRecs.length !== 1 ? 's' : ''} found`;
    }

    // --- Property intelligence ---
    const properties: any[] = best.Properties ?? best.properties ?? best.PropertyRecords ?? [];
    const propertyIntelligence: EnformionProperty[] = properties.map((p: any) => {
      const addr = p.FullAddress ?? p.Address ?? [p.StreetAddress ?? p.Address1, p.City, p.State, p.Zip].filter(Boolean).join(', ');
      const ownerName = p.OwnerName ?? p.owner_name ?? undefined;
      const rawPropType = p.PropertyType ?? p.property_type ?? '';
      const purchaseDateRaw = p.SaleDate ?? p.PurchaseDate ?? p.sale_date ?? undefined;
      const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : undefined;
      const yearsOwned = purchaseDate ? `Since ${purchaseDate}` : undefined;
      const saleAmt = p.SaleAmount ?? p.PurchasePrice ?? p.sale_amount;
      const avm = p.EstimatedValue ?? p.AVM ?? p.avm ?? p.estimated_value;
      const rent = p.EstimatedRent ?? p.estimated_rent;
      return {
        address: addr,
        ownerName,
        ownerType: ownerName ? classifyOwnerType(ownerName) : undefined,
        purchasePrice: saleAmt ? `$${Number(saleAmt).toLocaleString()}` : undefined,
        purchaseDate,
        yearsOwned,
        currentValue: avm ? `$${Number(avm).toLocaleString()}` : undefined,
        estimatedRent: rent ? `$${Number(rent).toLocaleString()}/mo` : undefined,
        propertyType: rawPropType ? classifyPropertyType(rawPropType) : undefined,
        beds: p.Bedrooms ?? p.Beds ?? p.beds ?? undefined,
        baths: p.Bathrooms ?? p.Baths ?? p.baths ?? undefined,
        sqft: p.SquareFeet ?? p.sqft ?? p.square_feet ?? undefined,
        yearBuilt: p.YearBuilt ?? p.year_built ?? undefined,
      };
    }).filter(p => p.address);

    const emails: string[] = (best.Emails ?? best.emails ?? [])
      .map((e: any) => e.EmailAddress ?? e.Email ?? e.email ?? e)
      .filter((e: any) => typeof e === 'string' && e.includes('@'))
      .slice(0, 3);

    return {
      phone: phoneResult,
      person: {
        fullName,
        age,
        dob,
        aliases,
        addresses,
        relatives,
        associates,
        emails,
        company,
        jobTitle,
        additionalPhones,
        maritalStatus,
        spouseName,
        priorMarriages,
        licenses,
        businessEntities,
        criminal,
        bankruptcy,
        evictions,
        propertyIntelligence,
      },
    };
  } catch (e) {
    console.log('ENFORMION_ERROR:', String(e));
    return { phone: emptyPhone(), person: {} };
  }
}

function emptyPhone(): EnformionPhone {
  return { lineType: 'mobile', origin: '—', active: true };
}
