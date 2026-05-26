// BeenVerified API - Background check
// Note: BeenVerified has a partner API program. Contact them at enterprise@beenverified.com
// Alternative: use Spokeo, Intelius, or CheckPeople APIs

export interface BackgroundCheckResult {
  fullName?: string;
  age?: number;
  dob?: string;
  aliases?: string[];
  maritalStatus?: string;
  spouse?: string;
  priorMarriages?: string;
  relatives?: string[];
  associates?: string[];
  socialHandles?: string[];
  socialPresence?: string;
  socialInconsistency?: string;
  hasFlags?: boolean;
}

export async function runBackgroundCheck(phone: string, name?: string): Promise<BackgroundCheckResult> {
  const apiKey = process.env.BEENVERIFIED_API_KEY;

  if (!apiKey || apiKey === 'YOUR_BEENVERIFIED_KEY') {
    return getMockBgData(name);
  }

  // BeenVerified partner API endpoint
  const cleaned = phone.replace(/\D/g, '');
  const url = `https://api.beenverified.com/v1/search/phone`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: cleaned, name }),
  });

  if (!res.ok) throw new Error(`BeenVerified API error: ${res.status}`);

  const data = await res.json();
  const person = data.person;

  return {
    fullName: person?.full_name,
    age: person?.age,
    dob: person?.date_of_birth,
    aliases: person?.aliases?.map((a: any) => a.full_name),
    maritalStatus: person?.relationships?.marital_status ?? 'Unknown',
    spouse: person?.relationships?.spouse?.full_name,
    priorMarriages: String(person?.relationships?.prior_marriages ?? '0'),
    relatives: person?.relatives?.map((r: any) => r.full_name) ?? [],
    associates: person?.associates?.map((a: any) => a.full_name) ?? [],
    socialHandles: person?.social_profiles?.map((s: any) => `${s.platform}: @${s.handle}`) ?? [],
    socialPresence: person?.social_summary ?? 'Limited public presence.',
    socialInconsistency: person?.inconsistencies?.join(', ') ?? 'None flagged.',
    hasFlags: (person?.flags?.length ?? 0) > 0,
  };
}

function getMockBgData(name?: string): BackgroundCheckResult {
  return {
    fullName: name ?? 'Marcus Anderson',
    age: 41,
    dob: 'March 15, 1983',
    aliases: [],
    maritalStatus: 'Single',
    priorMarriages: '1',
    relatives: ['James Anderson', 'Patricia Anderson', 'Michael Anderson'],
    associates: ['Robert Chen', 'Sarah Williams'],
    socialHandles: ['Instagram: @manderson', 'LinkedIn: /in/marcusanderson'],
    socialPresence: 'Moderate public presence across two platforms. Activity consistent with stated profession.',
    socialInconsistency: 'None flagged.',
    hasFlags: false,
  };
}
