// Whitepages API v2

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
  linkedinUrl?: string;
  company?: string;
  jobTitle?: string;
}

export async function lookupPhone(phone: string): Promise<WhitepagesPhoneResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.WHITEPAGES_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_WHITEPAGES_PRO_KEY') {
    return getMockPhoneData(phone);
  }

  try {
    const cleaned = phone.replace(/\D/g, '');
    const res = await fetch(`https://api.whitepages.com/v2/person?phone=${cleaned}&include_historical_locations=true`, {
      headers: { 'X-Api-Key': apiKey, 'Accept': 'application/json' },
    });

    console.log('WP_PHONE_STATUS:', res.status);
    if (!res.ok) return getMockPhoneData(phone);

    const data = await res.json();
    const person = Array.isArray(data) ? data[0] : null;
    const phoneRecord = person?.phones?.[0];

    return {
      carrier: phoneRecord?.carrier ?? 'Unknown',
      lineType: phoneRecord?.type === 'voip' ? 'voip' : phoneRecord?.type === 'mobile' ? 'mobile' : 'landline',
      voipFlag: phoneRecord?.type === 'voip' ? 'Number registered to a VoIP service. May indicate a secondary or temporary line.' : undefined,
      numberAge: '—',
      origin: 'United States',
      active: true,
    };
  } catch (e) {
    console.log('WP_PHONE_ERROR:', e);
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
    params.set('include_fuzzy_matching', 'true');

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
    console.log('WP_PERSON_COUNT:', Array.isArray(data) ? data.length : 0);

    const person = Array.isArray(data) ? data[0] : null;
    if (!person) return {};

    // Current addresses
    const currentAddrs = (person.current_addresses ?? []).map((a: any) => ({
      addr: a.full_address ?? [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', '),
      years: 'Current',
      current: true,
      detail: person.owned_properties?.some((p: any) => p.address?.includes(a.city)) ? 'Owned property' : 'Residential',
      owned: person.owned_properties?.some((p: any) => p.address?.includes(a.city)) ?? false,
    }));

    // Historic addresses
    const historicAddrs = (person.historic_addresses ?? []).slice(0, 4).map((a: any) => ({
      addr: a.full_address ?? [a.line1, a.city, a.state, a.zip].filter(Boolean).join(', '),
      years: 'Previous',
      current: false,
      detail: 'Previous address',
      owned: false,
    }));

    const addresses = [...currentAddrs, ...historicAddrs];

    // Relatives
    const relatives = (person.relatives ?? []).map((r: any) => r.name).filter(Boolean);

    // Aliases
    const aliases = (person.aliases ?? []).filter(Boolean);

    // DOB
    const dob = person.date_of_birth
      ? new Date(person.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : undefined;

    return {
      fullName: person.name ?? undefined,
      age: person.age ?? undefined,
      dob,
      aliases,
      addresses,
      relatives,
      associates: [],
      linkedinUrl: person.linkedin_url ?? undefined,
      company: person.company_name ?? undefined,
      jobTitle: person.job_title ?? undefined,
    };
  } catch (e) {
    console.log('WP_PERSON_ERROR:', e);
    return {};
  }
}

function phoneSeed(phone: string): number {
  const d = phone.replace(/\D/g, '');
  return d.slice(-4).split('').reduce((a, c, i) => a + parseInt(c) * (i + 1), 0);
}

function pick<T>(arr: T[], n: number): T { return arr[Math.abs(n) % arr.length]; }

function getMockPhoneData(phone: string): WhitepagesPhoneResult {
  const s = phoneSeed(phone);
  const isVoip = s % 9 === 0;
  const carriers = ['T-Mobile', 'AT&T', 'Verizon', 'Google Fi', 'US Cellular', 'Metro by T-Mobile', 'Cricket Wireless', 'Boost Mobile'];
  const ages = ['8 months', '2 years', '3 years', '5 years', '6 years', '8 years', '11 years', '14 years'];

  if (isVoip) {
    return { carrier: 'TextNow (VoIP)', lineType: 'voip', numberAge: '—', origin: 'United States', active: true,
      voipFlag: 'Number registered to a VoIP service — not a carrier-issued line. May indicate a secondary or temporary number.' };
  }
  return { carrier: pick(carriers, s), lineType: 'mobile', numberAge: pick(ages, s + 3), origin: 'United States', active: true };
}
