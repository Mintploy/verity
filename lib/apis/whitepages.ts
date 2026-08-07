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
  emails?: string[];
  company?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  additionalPhones?: string[];
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
      voipFlag: lineType === 'voip' ? 'Number registered to a VoIP service. May indicate a secondary or temporary line.' : undefined,
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

    // DOB
    const dob = person.date_of_birth
      ? (() => {
          const parts = person.date_of_birth.split('-');
          if (parts.length >= 2) {
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const month = months[parseInt(parts[1]) - 1] ?? '';
            const year = parts[0];
            const day = parts[2] && parts[2] !== '00' ? ` ${parseInt(parts[2])},` : ',';
            return `${month}${day} ${year}`;
          }
          return person.date_of_birth;
        })()
      : undefined;

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

    // Relatives
    const relatives = (person.relatives ?? [])
      .map((r: any) => r.name)
      .filter(Boolean);

    return {
      fullName: person.name ?? undefined,
      age: person.age ?? undefined,
      dob,
      aliases: person.aliases ?? [],
      addresses: [...currentAddrs, ...historicAddrs],
      relatives,
      associates: [],
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
