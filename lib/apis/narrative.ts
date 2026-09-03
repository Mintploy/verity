import Anthropic from '@anthropic-ai/sdk';

export interface NarrativeResult {
  scoop: string;
  vibes: Array<{ label: string; detail: string }>;
}

export async function generateNarrative(data: {
  name: string;
  age?: number;
  dob?: string;
  phone?: string;
  maritalStatus?: string;
  priorMarriages?: string;
  spouse?: string;
  jobTitle?: string;
  company?: string;
  businessEntities?: string;
  licenses?: string;
  addresses?: Array<{ addr: string; years: string; current: boolean; detail: string }>;
  propertyIntelligence?: Array<{
    address: string; ownerType?: string; purchasePrice?: string; purchaseDate?: string;
    yearsOwned?: string; currentValue?: string; propertyType?: string;
  }>;
  publicRecords?: Array<{ label: string; value: string; good?: boolean; flag?: boolean }>;
  phoneLineType?: string;
  score?: string;
}): Promise<NarrativeResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  const lines: string[] = [];
  if (data.name) lines.push(`Name: ${data.name}`);
  if (data.age) lines.push(`Age: ${data.age}`);
  if (data.jobTitle || data.company) lines.push(`Employment: ${[data.jobTitle, data.company].filter(Boolean).join(' at ')}`);
  if (data.businessEntities && data.businessEntities !== 'None found.') lines.push(`Business entities: ${data.businessEntities}`);
  if (data.licenses && data.licenses !== '—') lines.push(`Professional licenses: ${data.licenses}`);
  if (data.maritalStatus && data.maritalStatus !== '—') lines.push(`Marital status: ${data.maritalStatus}`);
  if (data.priorMarriages && data.priorMarriages !== '—') lines.push(`Prior marriages: ${data.priorMarriages}`);
  if (data.spouse) lines.push(`Spouse: ${data.spouse}`);
  if (data.phoneLineType === 'voip') lines.push(`Phone: VoIP number (not a carrier line)`);
  if (data.addresses?.length) {
    const current = data.addresses.find(a => a.current);
    if (current) lines.push(`Current address: ${current.addr} (${current.years})`);
    const prev = data.addresses.filter(a => !a.current);
    if (prev.length) lines.push(`Previous addresses: ${prev.map(a => `${a.addr} (${a.years})`).join('; ')}`);
  }
  if (data.propertyIntelligence?.length) {
    data.propertyIntelligence.forEach(p => {
      const details = [
        p.propertyType, p.ownerType ? `owned by ${p.ownerType}` : null,
        p.currentValue ? `est. value ${p.currentValue}` : null,
        p.purchasePrice ? `purchased ${p.purchasePrice}` : null,
        p.purchaseDate ? `in ${p.purchaseDate}` : null,
      ].filter(Boolean).join(', ');
      lines.push(`Property: ${p.address} — ${details}`);
    });
  }
  if (data.publicRecords?.length) {
    const flags = data.publicRecords.filter(r => r.flag && r.value !== 'None found' && r.value !== 'Not listed');
    const clean = data.publicRecords.filter(r => r.good && r.value && r.value !== '—');
    if (flags.length) lines.push(`Flagged records: ${flags.map(r => `${r.label}: ${r.value}`).join('; ')}`);
    if (clean.length) lines.push(`Clean records: ${clean.map(r => r.label).join(', ')}`);
  }

  const prompt = `You are Verity, a women's safety intelligence service. You just completed a background search on a man a woman is considering dating. Your role is the brilliant older sister — warm, direct, honest, never alarmist.

Write "The Scoop" — a 2-3 sentence summary of what matters about this person, based only on the data below. Do not speculate or invent anything not in the data. If data is sparse, keep it short and honest. Then produce 3-6 "Key Vibes" — short cards (a label and one sentence) covering the most notable facts.

DATA:
${lines.join('\n')}

Return valid JSON only:
{
  "scoop": "2-3 sentence paragraph",
  "vibes": [
    { "label": "Short label", "detail": "One sentence fact." }
  ]
}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.scoop || !Array.isArray(parsed.vibes)) return null;
    return parsed as NarrativeResult;
  } catch (e) {
    console.log('NARRATIVE_ERROR:', String(e));
    return null;
  }
}
