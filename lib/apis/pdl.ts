// People Data Labs API - Professional/employment data
// Docs: https://docs.peopledatalabs.com/
// Free tier: 100 enrichments/month at peopledatalabs.com

export interface PdlResult {
  title?: string;
  company?: string;
  tenure?: string;
  llcs?: string;
}

export async function lookupProfessional(name?: string): Promise<PdlResult> {
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const apiKey = process.env.PDL_API_KEY;

  if (!liveAllowed || !apiKey || apiKey === 'YOUR_PDL_KEY') {
    return getMockProfessionalData(name);
  }

  try {
    const res = await fetch('https://api.peopledatalabs.com/v5/person/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) return getMockProfessionalData(name);

    const data = await res.json();
    const exp = data.data?.experience?.[0];
    const llcs = data.data?.company_names?.filter((c: string) => c !== exp?.company?.name).join(', ');

    return {
      title: exp?.title?.name ?? '—',
      company: exp?.company?.name ?? '—',
      tenure: exp?.start_date ? `${new Date().getFullYear() - new Date(exp.start_date).getFullYear()} years` : '—',
      llcs: llcs || 'None found.',
    };
  } catch {
    return getMockProfessionalData(name);
  }
}

const PROFESSIONAL_PROFILES = [
  { title: 'Senior Staff Engineer', company: 'Stripe', tenure: '4 years', llcs: 'None found.' },
  { title: 'Managing Partner', company: 'Meridian Capital Group', tenure: '9 years', llcs: 'Meridian Holdings LLC, 3211 Oak LLC' },
  { title: 'Associate, M&A Advisory', company: 'Goldman Sachs', tenure: '3 years', llcs: 'None found.' },
  { title: 'Founder & CEO', company: 'Fielder AI (Series A)', tenure: '4 years', llcs: 'Fielder AI Inc., JAH Ventures LLC' },
  { title: 'Real Estate Operator', company: 'Reeves Holdings LLC', tenure: '11 years', llcs: 'Reeves Holdings LLC, SunBelt Properties LLC, MR 2017 Trust' },
  { title: 'Corporate Attorney', company: 'Kirkland & Ellis LLP', tenure: '6 years', llcs: 'None found.' },
  { title: 'VP of Product', company: 'Airbnb', tenure: '5 years', llcs: 'None found.' },
  { title: 'Portfolio Manager', company: 'Bridgewater Associates', tenure: '8 years', llcs: 'Voss Capital Partners LLC' },
];

function phoneSeed(name?: string): number {
  if (!name) return 42;
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function getMockProfessionalData(name?: string): PdlResult {
  const s = phoneSeed(name);
  return PROFESSIONAL_PROFILES[Math.abs(s) % PROFESSIONAL_PROFILES.length];
}
