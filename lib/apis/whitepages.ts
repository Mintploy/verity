// Whitepages Pro API - Phone intelligence + People Search

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
}

export async function lookupPhone(phone: string): Promise<WhitepagesPhoneResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.WHITEPAGES_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_WHITEPAGES_PRO_KEY') {
    return getMockPhoneData(phone);
  }

  try {
    const cleaned = phone.replace(/\D/g, '');
    const res = await fetch(`https://proapi.whitepages.com/3.3/phone?phone_number=${cleaned}`, {
      headers: { 'api_key': apiKey, 'Accept': 'application/json' },
    });

    if (!res.ok) return getMockPhoneData(phone);

    const data = await res.json();
    console.log('Whitepages phone raw:', JSON.stringify(data, null, 2));
    const result = data.results?.[0];

    return {
      carrier: result?.carrier?.name ?? 'Unknown',
      lineType: result?.line_type === 'NonFixedVOIP' ? 'voip' : result?.line_type === 'Mobile' ? 'mobile' : 'landline',
      voipFlag: result?.line_type === 'NonFixedVOIP' ? 'Number registered to a VoIP service. May indicate a secondary or temporary line.' : undefined,
      numberAge: result?.subscriber_age_months ? `${Math.round(result.subscriber_age_months / 12)} years` : '—',
      origin: result?.country_calling_code === '1' ? 'United States' : result?.country_calling_code ?? '—',
      active: result?.is_active ?? true,
    };
  } catch {
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

    const res = await fetch(`https://proapi.whitepages.com/3.3/person?${params.toString()}`, {
      headers: { 'api_key': apiKey, 'Accept': 'application/json' },
    });

    if (!res.ok) return {};

    const data = await res.json();
    console.log('Whitepages people raw:', JSON.stringify(data, null, 2));

    const person = data.results?.[0];
    if (!person) return {};

    const locations = person.locations ?? [];
    const addresses = locations.slice(0, 5).map((loc: any, i: number) => {
      const street = [loc.street_line_1, loc.street_line_2].filter(Boolean).join(' ');
      const cityState = [loc.city, loc.state_code].filter(Boolean).join(', ');
      const zip = loc.postal_code ?? '';
      const addr = [street, cityState, zip].filter(Boolean).join(', ');
      const type = loc.location_type ?? '';
      const isOwned = type.toLowerCase().includes('own');
      const dateRange = loc.valid_for?.length
        ? loc.valid_for.map((d: any) => d.start ? new Date(d.start).getFullYear() : '').filter(Boolean).join('–')
        : '';
      return {
        addr: addr || '—',
        years: dateRange || (i === 0 ? 'Current' : 'Previous'),
        current: i === 0,
        detail: type ? `${type}${isOwned ? ', owned' : ''}` : 'Residential',
        owned: isOwned,
      };
    });

    const fullName = [person.name?.first, person.name?.middle_initial, person.name?.last]
      .filter(Boolean).join(' ') || undefined;

    const age = person.age_range?.min
      ? Math.round((person.age_range.min + (person.age_range.max ?? person.age_range.min)) / 2)
      : person.age ?? undefined;

    const dob = person.birth_date
      ? new Date(person.birth_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : undefined;

    const aliases = person.alternate_names?.map((a: any) =>
      [a.first, a.last].filter(Boolean).join(' ')
    ).filter(Boolean) ?? [];

    const associates = person.associated_people?.map((p: any) =>
      [p.name?.first, p.name?.last].filter(Boolean).join(' ')
    ).filter(Boolean) ?? [];

    return { fullName, age, dob, aliases, addresses, associates, relatives: [] };
  } catch {
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
