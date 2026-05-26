// People Data Labs API - Professional/employment data
// Docs: https://docs.peopledatalabs.com/

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
    return getMockProfessionalData();
  }

  const res = await fetch('https://api.peopledatalabs.com/v5/person/enrich', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) return getMockProfessionalData();

  const data = await res.json();
  const person = data.data;

  const currentJob = person?.experience?.find((e: any) => !e.end_date);

  return {
    title: currentJob?.title ?? person?.job_title ?? '—',
    company: currentJob?.company?.name ?? person?.job_company_name ?? '—',
    tenure: currentJob?.start_date ? `${new Date(currentJob.start_date).getFullYear()}–present` : '—',
    income: person?.inferred_salary ? `$${Math.round(person.inferred_salary / 1000)}K` : '—',
    networth: '—',
    llcs: person?.companies?.filter((c: any) => c.type === 'LLC').map((c: any) => c.name).join(', ') || 'None found.',
  };
}

function getMockProfessionalData(): PdlResult {
  return {
    title: 'Principal, Real Estate Operations',
    company: 'Anderson Holdings LLC',
    tenure: '2019–present',
    income: '$260K–$310K est.',
    networth: '$1.2M–$1.8M est.',
    llcs: 'Anderson Holdings LLC (2019, AZ) · Mesa Capital Group LLC (2021, AZ)',
  };
}
