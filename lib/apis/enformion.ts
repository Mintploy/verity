// Enformion — comprehensive people intelligence API
// Replaces Whitepages (identity/phone) + ATTOM (property) + OpenCorporates (business)
// Auth: HTTP Basic Auth — ENFORMION_USERNAME + ENFORMION_PASSWORD
// Endpoint: POST https://gw.enformion.com/1.0/person/search

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
  owned?: boolean;
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
  // Indicator-based flags (no detail text — requires separate API call)
  hasBankruptcy?: boolean;
  hasEvictions?: boolean;
  hasForeclosures?: boolean;
  hasJudgments?: boolean;
  hasLiens?: boolean;
  hasBusinessRecords?: boolean;
  hasDivorceRecords?: boolean;
  hasPropertyRecords?: boolean;
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
  // DOB format from Enformion: "1/XX/1964" — only year is reliable
  const parts = dobStr.split('/');
  const year = parseInt(parts[parts.length - 1]);
  if (!year || year < 1900) return null;
  return new Date().getFullYear() - year;
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
    // Actual field is lowercase "results"
    const results: any[] = data.results ?? [];
    console.log('ENFORMION_RESULTS:', results.length);
    if (!results.length) return { phone: emptyPhone(), person: {} };

    // Phone search ranking puts best match first
    const best = results[0];

    // --- Phone intelligence ---
    const phoneNumbers: any[] = best.phoneNumbers ?? [];
    const matchedPhone = phoneNumbers.find(
      (p: any) => (p.phoneNumber ?? '').replace(/\D/g, '') === cleaned
    ) ?? phoneNumbers.sort((a: any, b: any) => (a.phoneOrder ?? 999) - (b.phoneOrder ?? 999))[0];

    const rawLineType = matchedPhone?.phoneType ?? '';
    const lineType = classifyLineType(rawLineType);
    const carrier = matchedPhone?.company ?? undefined;

    const phoneResult: EnformionPhone = {
      lineType,
      carrier,
      voipFlag: lineType === 'voip'
        ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.'
        : undefined,
      origin: 'United States',
      active: !(best.deathRecords?.isDeceased ?? false),
    };

    // --- Identity ---
    const fullName: string | undefined = best.fullName
      ?? (best.name ? buildName(best.name) : undefined);

    // DOB is often empty in search; datesOfBirth has only {age}
    const age: number | undefined = best.age ?? undefined;
    const dob: string | undefined = (best.dob && best.dob !== '') ? best.dob : undefined;

    const aliases: string[] = (best.akas ?? [])
      .map((a: any) => buildName(a))
      .filter(Boolean)
      .filter((n: string) => n !== fullName);

    // --- Addresses ---
    const rawAddresses: any[] = best.addresses ?? [];
    // addressOrder 1 = most recently seen; sort ascending
    const sortedAddresses = [...rawAddresses]
      .sort((a: any, b: any) => (a.addressOrder ?? 999) - (b.addressOrder ?? 999))
      .slice(0, 8); // cap at 8

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
      const isHighRisk = a.highRiskMarker?.isHighRisk ?? false;
      return {
        addr,
        years,
        current: isCurrent,
        detail: isCurrent ? 'Current address' : 'Previous address',
        flag: isHighRisk,
      };
    }).filter((a: any) => a.addr);

    // --- Relatives + spouse detection ---
    const relativesSummary: any[] = best.relativesSummary ?? [];

    const currentSpouse = relativesSummary.find(
      (r: any) => r.spouse === 1 && !r.oldSpouse && !r.isDeceased
    );
    const spouseName: string | undefined = currentSpouse
      ? buildName(currentSpouse)
      : undefined;

    const priorSpouses = relativesSummary.filter((r: any) => r.oldSpouse === true);
    let priorMarriages: string | undefined;
    if (priorSpouses.length > 0) {
      priorMarriages = `${priorSpouses.length} prior marriage${priorSpouses.length !== 1 ? 's' : ''} on record`;
    }

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
    const associatesSummary: any[] = best.associatesSummary ?? [];
    const associates: string[] = associatesSummary
      .slice(0, 8)
      .map((a: any) => buildName(a))
      .filter(Boolean);

    // --- Additional phones ---
    const additionalPhones: string[] = phoneNumbers
      .filter((p: any) => (p.phoneNumber ?? '').replace(/\D/g, '') !== cleaned)
      .sort((a: any, b: any) => (a.phoneOrder ?? 999) - (b.phoneOrder ?? 999))
      .slice(0, 3)
      .map((p: any) => `${p.phoneNumber} (${p.phoneType ?? 'unknown'})`);

    // --- Emails ---
    const emails: string[] = (best.emailAddresses ?? [])
      .filter((e: any) => e.nonBusiness === 1) // personal only
      .map((e: any) => e.emailAddress)
      .filter((e: any) => typeof e === 'string' && e.includes('@'))
      .slice(0, 3);

    // --- Indicators (flags without details — separate API calls needed for full records) ---
    const indicators = best.indicators ?? {};
    const hasBankruptcy = (indicators.hasBankruptcyRecords ?? 0) > 0;
    const hasEvictions = (indicators.hasEvictionsRecords ?? 0) > 0;
    const hasForeclosures = (indicators.hasForeclosuresRecords ?? 0) > 0;
    const hasJudgments = (indicators.hasJudgmentRecords ?? 0) > 0;
    const hasLiens = (indicators.hasLienRecords ?? 0) > 0;
    const hasBusinessRecords = (indicators.hasBusinessRecords ?? 0) > 0;
    const hasDivorceRecords = (indicators.hasDivorceRecords ?? 0) > 0;
    const hasPropertyRecords = (indicators.hasPropertyRecords ?? 0) > 0;

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
        additionalPhones,
        maritalStatus,
        spouseName,
        priorMarriages,
        hasBankruptcy,
        hasEvictions,
        hasForeclosures,
        hasJudgments,
        hasLiens,
        hasBusinessRecords,
        hasDivorceRecords,
        hasPropertyRecords,
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
