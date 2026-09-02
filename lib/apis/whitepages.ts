// Whitepages API v2
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseDob(raw: string): string {
  const parts = raw.split('-');
  if (parts.length < 2) return raw;
  const month = MONTHS[parseInt(parts[1]) - 1] ?? '';
  const year = parts[0];
  const dayNum = parts[2] && parts[2] !== '00' ? parseInt(parts[2]) : null;
  return dayNum ? `${month} ${dayNum}, ${year}` : `${month} ${year}`;
}

// Single consolidated call returns both phone intelligence and person data.

export interface WhitepagesPhoneResult {
  carrier: string;
  lineType: 'mobile' | 'voip' | 'landline';
  voipFlag?: string;
  numberAge: string;
  origin: string;
  active: boolean;
}

export interface WhitepagesPeopleResult {
  fullName?: string;
  age?: number;
  dob?: string;
  aliases?: string[];
  addresses?: Array<{
    addr: string;
    years: string;
    current: boolean;
    detail: string;
    owned?: boolean;
  }>;
  associates?: string[];
  relatives?: string[];
  emails?: string[];
  company?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  additionalPhones?: string[];
  maritalStatus?: string;
  spouseName?: string;
  priorMarriages?: string;
  licenses?: string;
  education?: string[];
}

export interface WhitepagesCombined {
  phone: WhitepagesPhoneResult;
  person: WhitepagesPeopleResult;
}

// Single-call replacement for lookupPhone + lookupPerson — saves one billable /v2/person hit.
export async function lookupWhitepages(phone: string, name?: string): Promise<WhitepagesCombined> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.WHITEPAGES_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_WHITEPAGES_PRO_KEY') {
    return { phone: getMockPhoneData(phone), person: {} };
  }

  try {
    const cleaned = phone.replace(/\D/g, '');
    const params = new URLSearchParams({ phone: cleaned, include_historical_locations: 'true' });
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        params.set('first_name', parts[0]);
        params.set('last_name', parts.slice(1).join(' '));
      } else {
        params.set('name', name.trim());
      }
    }

    const res = await fetch(`https://api.whitepages.com/v2/person?${params.toString()}`, {
      headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
    });
    console.log('WP_STATUS:', res.status);
    if (!res.ok) return { phone: getMockPhoneData(phone), person: {} };

    const data = await res.json();
    const results = data.results ?? [];
    console.log('WP_COUNT:', results.length);
    if (!results.length) return { phone: getMockPhoneData(phone), person: {} };

    const best = results
      .filter((r: any) => r.matched_by?.includes('phone'))
      .sort((a: any, b: any) => (b.match_score ?? 0) - (a.match_score ?? 0))[0] ?? results[0];

    // --- Phone intelligence ---
    // WP v2 API uses line_type (not type) and carrier or carrier_name depending on tier
    const phoneRecord = best.phones?.find((p: any) => p.number?.replace(/\D/g, '') === cleaned) ?? best.phones?.[0];
    const rawLineType = (phoneRecord?.line_type ?? phoneRecord?.type ?? '').toLowerCase();
    const lineType: WhitepagesPhoneResult['lineType'] = rawLineType.includes('voip') ? 'voip'
      : rawLineType === 'mobile' ? 'mobile' : 'landline';
    const carrierName = phoneRecord?.carrier_name ?? phoneRecord?.carrier ?? phoneRecord?.line_type ?? 'Unknown';
    const phoneResult: WhitepagesPhoneResult = {
      carrier: carrierName,
      lineType,
      voipFlag: lineType === 'voip' ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.' : undefined,
      numberAge: phoneRecord?.prepaid ? 'Prepaid line' : '—',
      origin: phoneRecord?.country_calling_code === '1' || !phoneRecord?.country_calling_code ? 'United States' : 'International',
      active: !(best.is_dead ?? false),
    };

    // --- Person data ---
    const currentAddrs = (best.current_addresses ?? []).map((a: any) => ({
      addr: a.full_address ?? [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', '),
      years: 'Current',
      current: true,
      detail: (best.owned_properties ?? []).some((p: any) => a.full_address && p.address?.includes(a.city)) ? 'Owned property' : 'Residential',
      owned: (best.owned_properties ?? []).some((p: any) => a.full_address && p.address?.includes(a.city)),
    }));
    const historicAddrs = (best.historic_addresses ?? []).slice(0, 4).map((a: any) => ({
      addr: a.full_address ?? [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', '),
      years: 'Previous address',
      current: false,
      detail: [a.city, a.state].filter(Boolean).join(', ') || 'Historic address',
      owned: false,
    }));

    const dob = best.date_of_birth ? parseDob(best.date_of_birth) : undefined;

    // Marital status + prior marriages
    const wpMaritalStatus: string | undefined = best.marital_status ?? undefined;
    const wpSpouse = (best.associated_people ?? best.relatives ?? [])
      .find((r: any) => r.relation?.toLowerCase() === 'spouse' || r.type?.toLowerCase() === 'spouse');
    const wpSpouseName: string | undefined = wpSpouse?.name ?? undefined;

    const divorceDates: string[] = best.divorce_dates ?? [];
    const marriageDates: string[] = best.marriage_dates ?? [];
    let priorMarriages: string | undefined;
    if (divorceDates.length > 0) {
      const years = divorceDates.map((d: string) => new Date(d).getFullYear()).join(', ');
      priorMarriages = divorceDates.length === 1
        ? `1 prior marriage · divorced ${years}`
        : `${divorceDates.length} prior marriages · divorced ${years}`;
    } else if (marriageDates.length > 1) {
      priorMarriages = `${marriageDates.length - 1} prior marriage(s) on record`;
    } else if (wpMaritalStatus === 'Divorced' || wpMaritalStatus === 'Separated') {
      priorMarriages = 'At least 1 (currently divorced)';
    } else if (wpMaritalStatus === 'Widowed') {
      priorMarriages = 'At least 1 (widowed)';
    }

    // Professional licenses — available from state public records in some WP tiers
    const wpLicenseList: string[] = (best.professional_licenses ?? []).map((l: any) => {
      return [l.type ?? l.name, l.state, l.status ? `(${l.status})` : null].filter(Boolean).join(' · ');
    }).filter(Boolean);
    const licenses: string | undefined = wpLicenseList.length > 0 ? wpLicenseList.join('; ') : undefined;

    // Education
    const education: string[] = (best.education ?? []).map((e: any) => {
      return [e.school_name ?? e.name, e.degree, e.graduation_year ? `${e.graduation_year}` : null].filter(Boolean).join(', ');
    }).filter(Boolean);

    const personResult: WhitepagesPeopleResult = {
      fullName: best.name ?? undefined,
      age: best.age ?? undefined,
      dob,
      aliases: best.aliases ?? [],
      addresses: [...currentAddrs, ...historicAddrs],
      maritalStatus: wpMaritalStatus,
      spouseName: wpSpouseName,
      relatives: (best.relatives ?? []).map((r: any) => {
        const parts: string[] = [];
        if (r.name) parts.push(r.name);
        if (r.age) parts.push(`age ${r.age}`);
        const relPhone = r.phones?.[0]?.number;
        if (relPhone) parts.push(relPhone);
        const relAddr = r.current_addresses?.[0];
        if (relAddr) {
          const city = relAddr.city;
          const state = relAddr.state;
          if (city && state) parts.push(`${city}, ${state}`);
        }
        return parts.join(' · ');
      }).filter(Boolean),
      associates: (best.associates ?? []).map((a: any) => {
        const parts: string[] = [];
        if (a.name) parts.push(a.name);
        const assocPhone = a.phones?.[0]?.number;
        if (assocPhone) parts.push(assocPhone);
        return parts.join(' · ');
      }).filter(Boolean),
      emails: (best.emails ?? []).filter((e: any) => (e.score ?? 0) >= 50).map((e: any) => e.email).slice(0, 3),
      company: best.company_name ?? undefined,
      jobTitle: best.job_title ?? undefined,
      linkedinUrl: best.linkedin_url ?? undefined,
      additionalPhones: (best.phones ?? [])
        .filter((p: any) => p.number?.replace(/\D/g, '') !== cleaned && (p.score ?? 0) >= 70)
        .map((p: any) => `${p.number} (${p.type})`)
        .slice(0, 3),
      priorMarriages,
      licenses,
      education: education.length > 0 ? education : undefined,
    };

    return { phone: phoneResult, person: personResult };
  } catch (e) {
    console.log('WP_ERROR:', String(e));
    return { phone: getMockPhoneData(phone), person: {} };
  }
}

export async function lookupPhone(phone: string): Promise<WhitepagesPhoneResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.WHITEPAGES_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_WHITEPAGES_PRO_KEY') {
    return getMockPhoneData(phone);
  }

  try {
    const cleaned = phone.replace(/\D/g, '');
    const res = await fetch(`https://api.whitepages.com/v2/person?phone=${cleaned}`, {
      headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
    });

    console.log('WP_PHONE_STATUS:', res.status);
    if (!res.ok) return getMockPhoneData(phone);

    const data = await res.json();
    const results = data.results ?? [];
    console.log('WP_PHONE_COUNT:', results.length);

    // Find the best match — highest match_score with phone in matched_by
    const best = results
      .filter((r: any) => r.matched_by?.includes('phone'))
      .sort((a: any, b: any) => (b.match_score ?? 0) - (a.match_score ?? 0))[0] ?? results[0];

    if (!best) return getMockPhoneData(phone);

    // Find the phone record matching the searched number
    const cleanedInput = cleaned;
    const phoneRecord = best.phones?.find((p: any) =>
      p.number?.replace(/\D/g, '') === cleanedInput
    ) ?? best.phones?.[0];

    const lineType = phoneRecord?.type === 'voip' ? 'voip'
      : phoneRecord?.type === 'mobile' ? 'mobile'
      : 'landline';

    return {
      carrier: phoneRecord?.type ?? 'Unknown',
      lineType,
      voipFlag: lineType === 'voip' ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.' : undefined,
      numberAge: '—',
      origin: 'United States',
      active: !best.is_dead,
    };
  } catch (e) {
    console.log('WP_PHONE_ERROR:', String(e));
    return getMockPhoneData(phone);
  }
}

export async function lookupPerson(phone: string, name?: string): Promise<WhitepagesPeopleResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.WHITEPAGES_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_WHITEPAGES_PRO_KEY') {
    return {};
  }

  try {
    const params = new URLSearchParams();
    params.set('phone', phone.replace(/\D/g, ''));
    params.set('include_historical_locations', 'true');

    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        params.set('first_name', parts[0]);
        params.set('last_name', parts.slice(1).join(' '));
      } else {
        params.set('name', name.trim());
      }
    }

    const res = await fetch(`https://api.whitepages.com/v2/person?${params.toString()}`, {
      headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
    });

    console.log('WP_PERSON_STATUS:', res.status);
    if (!res.ok) return {};

    const data = await res.json();
    const results = data.results ?? [];
    console.log('WP_PERSON_COUNT:', results.length);

    if (!results.length) return {};

    // Pick best match by match_score
    const person = results
      .filter((r: any) => r.matched_by?.includes('phone'))
      .sort((a: any, b: any) => (b.match_score ?? 0) - (a.match_score ?? 0))[0] ?? results[0];

    // Current addresses
    const currentAddrs = (person.current_addresses ?? []).map((a: any) => ({
      addr: a.full_address ?? [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', '),
      years: 'Current',
      current: true,
      detail: (person.owned_properties ?? []).some((p: any) =>
        a.full_address && p.address?.includes(a.city)
      ) ? 'Owned property' : 'Residential',
      owned: (person.owned_properties ?? []).some((p: any) =>
        a.full_address && p.address?.includes(a.city)
      ),
    }));

    // Historic addresses
    const historicAddrs = (person.historic_addresses ?? []).slice(0, 4).map((a: any, i: number) => ({
  addr: a.full_address ?? [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', '),
  years: `Previous address ${i + 1} of ${Math.min(4, (person.historic_addresses ?? []).length)} · Date range pending property records`,
  current: false,
  detail: `Historic address · ${a.city}, ${a.state}`,
  owned: false,
}));

    const dob = person.date_of_birth ? parseDob(person.date_of_birth) : undefined;

    // Additional phones (beyond the searched one)
    const cleanedInput = phone.replace(/\D/g, '');
    const additionalPhones = (person.phones ?? [])
      .filter((p: any) => p.number?.replace(/\D/g, '') !== cleanedInput && (p.score ?? 0) >= 70)
      .map((p: any) => `${p.number} (${p.type})`)
      .slice(0, 3);

    // Emails
    const emails = (person.emails ?? [])
      .filter((e: any) => (e.score ?? 0) >= 50)
      .map((e: any) => e.email)
      .slice(0, 3);

    // Relatives — include phone and city when available
    const relatives = (person.relatives ?? []).map((r: any) => {
      const parts: string[] = [];
      if (r.name) parts.push(r.name);
      if (r.age) parts.push(`age ${r.age}`);
      const relPhone = r.phones?.[0]?.number;
      if (relPhone) parts.push(relPhone);
      const relAddr = r.current_addresses?.[0];
      if (relAddr?.city && relAddr?.state) parts.push(`${relAddr.city}, ${relAddr.state}`);
      return parts.join(' · ');
    }).filter(Boolean);

    return {
      fullName: person.name ?? undefined,
      age: person.age ?? undefined,
      dob,
      aliases: person.aliases ?? [],
      addresses: [...currentAddrs, ...historicAddrs],
      relatives,
      associates: (person.associates ?? []).map((a: any) => {
        const parts: string[] = [];
        if (a.name) parts.push(a.name);
        const assocPhone = a.phones?.[0]?.number;
        if (assocPhone) parts.push(assocPhone);
        return parts.join(' · ');
      }).filter(Boolean),
      emails,
      company: person.company_name ?? undefined,
      jobTitle: person.job_title ?? undefined,
      linkedinUrl: person.linkedin_url ?? undefined,
      additionalPhones,
    };
  } catch (e) {
    console.log('WP_PERSON_ERROR:', String(e));
    return {};
  }
}

function getMockPhoneData(_phone: string): WhitepagesPhoneResult {
  return { carrier: '—', lineType: 'mobile', numberAge: '—', origin: '—', active: true };
}
