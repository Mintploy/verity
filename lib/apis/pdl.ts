// People Data Labs API - Professional/employment data
// Docs: https://docs.peopledatalabs.com/
// Free tier: 100 enrichments/month at peopledatalabs.com

export interface PdlResult {
  title?: string;
  company?: string;
  tenure?: string;
  income?: string;
  networth?: string;
  llcs?: string;
}

export async function lookupProfessional(name?: string): Promise<PdlResult> {
  const apiKey = process.env.PDL_API_KEY;

  if (!apiKey || apiKey === 'YOUR_PDL_KEY') {
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
    const income = data.data?.inferred_salary;
    const llcs = data.data?.company_names?.filter((c: string) => c !== exp?.company?.name).join(', ');

    return {
      title: exp?.title?.name ?? '—',
      company: exp?.company?.name ?? '—',
      tenure: exp?.start_date ? `${new Date().getFullYear() - new Date(exp.start_date).getFullYear()} years` : '—',
      income: income ? `$${Math.round(income.min / 1000)}K–$${Math.round(income.max / 1000)}K/year` : '—',
      networth: '—',
      llcs: llcs || 'None found.',
    };
  } catch {
    return getMockProfessionalData(name);
  }
}

const PROFESSIONAL_PROFILES = [
  { title: 'Senior Staff Engineer', company: 'Stripe', tenure: '4 years', income: '$375,000–$420,000/year', networth: 'Est. $1.2M–$1.8M', llcs: 'None found.' },
  { title: 'Managing Partner', company: 'Meridian Capital Group', tenure: '9 years', income: '$285,000–$340,000/year', networth: 'Est. $2.4M–$3.8M', llcs: 'Meridian Holdings LLC, 3211 Oak LLC' },
  { title: 'Associate, M&A Advisory', company: 'Goldman Sachs', tenure: '3 years', income: '$195,000–$230,000/year', networth: 'Est. $400K–$700K', llcs: 'None found.' },
  { title: 'Founder & CEO', company: 'Fielder AI (Series A)', tenure: '4 years', income: '$95,000–$140,000/year (current)', networth: 'Equity-dependent', llcs: 'Fielder AI Inc., JAH Ventures LLC' },
  { title: 'Real Estate Operator', company: 'Reeves Holdings LLC', tenure: '11 years', income: '$210,000–$280,000/year', networth: 'Est. $1.8M–$2.4M (property)', llcs: 'Reeves Holdings LLC, SunBelt Properties LLC, MR 2017 Trust' },
  { title: 'Corporate Attorney', company: 'Kirkland & Ellis LLP', tenure: '6 years', income: '$440,000–$560,000/year', networth: 'Est. $1.4M–$2.2M', llcs: 'None found.' },
  { title: 'VP of Product', company: 'Airbnb', tenure: '5 years', income: '$310,000–$380,000/year', networth: 'Est. $900K–$1.4M', llcs: 'None found.' },
  { title: 'Portfolio Manager', company: 'Bridgewater Associates', tenure: '8 years', income: '$480,000–$620,000/year', networth: 'Est. $2.8M–$4.2M', llcs: 'Voss Capital Partners LLC' },
];

function phoneSeed(name?: string): number {
  if (!name) return 42;
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function getMockProfessionalData(name?: string): PdlResult {
  const s = phoneSeed(name);
  return PROFESSIONAL_PROFILES[Math.abs(s) % PROFESSIONAL_PROFILES.length];
}
