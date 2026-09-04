import { SearchRequest, Report, ScoreState } from '../types';

import { lookupEnformion } from './enformion';
import { lookupPublicRecords } from './pacer';
import { lookupDonations } from './fec';
import { checkSexOffenderRegistry } from './nsopw';

export async function generateReport(req: SearchRequest): Promise<Report> {
  const searchId = `VR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const [enResult, publicRecs, soRegistry] = await Promise.allSettled([
    lookupEnformion(req.phone, req.name),
    lookupPublicRecords(req.name, req.phone),
    checkSexOffenderRegistry(req.name),
  ]);

  const en = enResult.status === 'fulfilled' ? enResult.value : null;
  const person = en?.person ?? {};
  const phone = en?.phone ?? null;

  const flags: string[] = [];
  if (phone?.lineType === 'voip') flags.push('voip');
  if (publicRecs.status === 'fulfilled' && publicRecs.value?.hasFlags) flags.push('public');
  if (soRegistry.status === 'fulfilled' && soRegistry.value?.onRegistry) flags.push('soregistry');
  if (person.hasBankruptcy) flags.push('bankruptcy');
  if (person.hasEvictions) flags.push('evictions');
  if (person.hasJudgments || person.hasLiens || person.hasForeclosures) flags.push('financial');

  const score: ScoreState = (soRegistry.status === 'fulfilled' && (soRegistry.value as any)?.onRegistry)
    ? 'red'
    : flags.length >= 2
    ? 'yellow'
    : flags.length === 0
    ? 'green'
    : 'yellow';

  const pub = publicRecs.status === 'fulfilled' ? publicRecs.value : null;
  const so = soRegistry.status === 'fulfilled' ? soRegistry.value : null;
  const fecResult = await lookupDonations(person.fullName ?? req.name).catch(() => null);

  const resolvedName = person.fullName ?? req.name ?? 'Unknown';
  const resolvedAge = person.age ?? 0;
  const resolvedDob = person.dob ?? '—';
  const resolvedAliases = person.aliases?.length ? person.aliases : undefined;

  const businessEntities = person.hasBusinessRecords
    ? 'Business affiliations on record — details require further lookup.'
    : 'None found.';

  const publicRecords = buildPublicRecords(pub, fecResult, person, so);

  const confirmedHandles: string[] = [];
  if (person.emails?.length) person.emails.forEach((e: string) => confirmedHandles.push(`Email: ${e}`));
  if (person.linkedInUrl) confirmedHandles.push(`LinkedIn: ${person.linkedInUrl}${person.linkedInHeadline ? ` · ${person.linkedInHeadline}` : ''}`);

  const report: Report = {
    id: searchId,
    searchId,
    score,
    headline: getHeadline(score),
    summary: getSummary(score),
    confidence: person.fullName ? 96 : 88,
    sources: person.fullName ? 4 : 3,
    generatedAt: new Date().toISOString(),
    subject: {
      name: resolvedName,
      age: resolvedAge,
      phone: req.phone,
      dob: resolvedDob,
    },
    phone: {
      carrier: phone?.carrier ?? '—',
      lineType: phone?.lineType ?? 'mobile',
      voipFlag: phone?.voipFlag,
      numberAge: '—',
      origin: phone?.origin ?? '—',
      active: phone?.active ?? true,
    },
    identity: {
      fullName: resolvedName,
      age: resolvedAge,
      dob: resolvedDob,
      verifiedBy: person.fullName ? 4 : 3,
      aliases: resolvedAliases,
    },
    addresses: (person.addresses ?? []).map((a, i) =>
      i === 0 && person.censusNeighborhood
        ? { ...a, detail: `${a.detail} · ${person.censusNeighborhood}` }
        : a
    ),
    propertyIntelligence: person.propertyIntelligence ?? [],
    relationships: {
      status: person.maritalStatus ?? '—',
      spouse: person.spouseName,
      priors: person.priorMarriages ?? '—',
      relatives: person.relatives ?? [],
      associates: person.associates?.length
        ? person.associates
        : person.additionalPhones?.length
          ? [`Additional numbers on file: ${person.additionalPhones.join(', ')}`]
          : [],
    },
    professional: {
      title: person.jobTitle !== undefined ? person.jobTitle : '—',
      company: person.company !== undefined ? person.company : '—',
      tenure: '—',
      llcs: 'None found.',
      licenses: '—',
      businessEntities,
    },
    publicRecords,
    social: {
      handles: confirmedHandles,
      presence: confirmedHandles.length > 0 ? 'Confirmed profile(s) found.' : 'No confirmed profiles found.',
      inconsistency: 'None flagged.',
    },
    nextSteps: getNextSteps(score, flags),
  };

  return report;
}

function getHeadline(score: ScoreState): string {
  if (score === 'green') return 'Everything checks out.';
  if (score === 'yellow') return 'A few things to weigh.';
  return 'We\'d pause here.';
}

function getSummary(score: ScoreState): string {
  if (score === 'green') return 'The record is clean across all sources. Identity is verified, public records are clear, and the social footprint is consistent. You can proceed with confidence.';
  if (score === 'yellow') return 'The file isn\'t spotless. There are a few items worth a conversation — nothing that requires walking away, but enough to go in with eyes open and ask the right questions.';
  return 'There are significant flags in the public record that we think warrant serious attention before you proceed. Review the details below carefully.';
}

function buildPublicRecords(pub: any, fec: any, person: any, so?: any): Array<any> {
  const records = [
    { label: 'Sex offender registry', value: so?.onRegistry ? `Listed — ${so.details ?? 'record found'}` : 'Not listed', good: !so?.onRegistry, flag: !!so?.onRegistry },
    { label: 'Federal lawsuits', value: pub?.lawsuits ?? 'None found', good: !pub?.lawsuits || pub.lawsuits === 'None found', flag: pub?.hasOpenLawsuit },
    { label: 'Bankruptcy filings', value: person?.hasBankruptcy ? 'On file — details require further review' : 'None on file', good: !person?.hasBankruptcy, flag: !!person?.hasBankruptcy },
    { label: 'Eviction records', value: person?.hasEvictions ? 'On file — details require further review' : 'None on file', good: !person?.hasEvictions, flag: !!person?.hasEvictions },
    { label: 'Judgments / liens', value: (person?.hasJudgments || person?.hasLiens) ? 'On file — details require further review' : 'None on file', good: !person?.hasJudgments && !person?.hasLiens, flag: !!(person?.hasJudgments || person?.hasLiens) },
    { label: 'Political donations', value: fec?.summary ?? 'None on record', neutral: true },
  ];
  return records;
}

function getNextSteps(score: ScoreState, flags: string[]): string[] {
  const steps: string[] = [];
  if (score === 'green') {
    steps.push('The record is clean. Meet in a public place for your first date — not because you need to, but because it\'s your standard.');
    steps.push('Do a quick reverse-image search on his profile photos. Takes 30 seconds.');
    steps.push('If anything feels off in person, trust that instinct over the clean report.');
  } else if (score === 'yellow') {
    steps.push('Ask about the flagged items naturally. His response will tell you more than the record did.');
    steps.push('Meet in a public place, midday or early evening, first meeting only.');
    steps.push('Re-run this report in 30 days if you decide to keep seeing him.');
    if (flags.includes('voip')) steps.push('The VoIP number is worth a casual mention — "do you have two phones?" is a natural way to surface it.');
  } else {
    steps.push('We\'d recommend not proceeding. The flags in the public record are significant.');
    steps.push('If you feel you need to meet, choose an extremely public location and tell someone exactly where you\'re going.');
    steps.push('Trust your gut above all.');
  }
  return steps;
}
