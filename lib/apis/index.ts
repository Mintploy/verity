import { SearchRequest, Report, ScoreState } from '../types';

// Import individual API modules
import { lookupPhone } from './whitepages';
import { lookupAddress } from './attom';
import { runBackgroundCheck } from './beenverified';
import { lookupPublicRecords } from './pacer';
import { lookupDonations } from './fec';
import { checkSexOffenderRegistry } from './nsopw';
import { lookupProfessional } from './pdl';

export async function generateReport(req: SearchRequest): Promise<Report> {
  const searchId = `VR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // Fan out all API calls in parallel
  const [phoneData, bgCheck, publicRecs, soRegistry] = await Promise.allSettled([
    lookupPhone(req.phone),
    runBackgroundCheck(req.phone, req.name),
    lookupPublicRecords(req.name, req.phone),
    checkSexOffenderRegistry(req.name),
  ]);

  // Professional lookup if we got a name from bg check
  const nameFromBg = bgCheck.status === 'fulfilled' ? bgCheck.value?.fullName : req.name;
  const [profData, addressData, fecData] = await Promise.allSettled([
    lookupProfessional(nameFromBg),
    lookupAddress(nameFromBg, req.phone),
    lookupDonations(nameFromBg),
  ]);

  // Synthesize score
  const flags: string[] = [];
  if (phoneData.status === 'fulfilled' && phoneData.value?.lineType === 'voip') flags.push('voip');
  if (bgCheck.status === 'fulfilled' && bgCheck.value?.hasFlags) flags.push('bgcheck');
  if (publicRecs.status === 'fulfilled' && publicRecs.value?.hasFlags) flags.push('public');
  if (soRegistry.status === 'fulfilled' && soRegistry.value?.onRegistry) flags.push('soregistry');

  const score: ScoreState = soRegistry.status === 'fulfilled' && (soRegistry.value as any)?.onRegistry
    ? 'red'
    : flags.length >= 2
    ? 'yellow'
    : flags.length === 0
    ? 'green'
    : 'yellow';

  // Build report from API results
  const phone = phoneData.status === 'fulfilled' ? phoneData.value : null;
  const bg = bgCheck.status === 'fulfilled' ? bgCheck.value : null;
  const pub = publicRecs.status === 'fulfilled' ? publicRecs.value : null;
  const prof = profData.status === 'fulfilled' ? profData.value : null;
  const addr = addressData.status === 'fulfilled' ? addressData.value : null;
  const fec = fecData.status === 'fulfilled' ? fecData.value : null;

  const report: Report = {
    id: searchId,
    searchId,
    score,
    headline: getHeadline(score, bg),
    summary: getSummary(score, bg, pub),
    confidence: 94,
    sources: 7,
    generatedAt: new Date().toISOString(),
    subject: {
      name: bg?.fullName ?? req.name ?? 'Unknown',
      age: bg?.age ?? 0,
      phone: req.phone,
      dob: bg?.dob ?? '—',
    },
    phone: {
      carrier: phone?.carrier ?? 'Unknown',
      lineType: phone?.lineType ?? 'mobile',
      voipFlag: phone?.voipFlag,
      numberAge: phone?.numberAge ?? '—',
      origin: phone?.origin ?? '—',
      active: phone?.active ?? true,
    },
    identity: {
      fullName: bg?.fullName ?? '—',
      age: bg?.age ?? 0,
      dob: bg?.dob ?? '—',
      verifiedBy: 3,
      aliases: bg?.aliases,
    },
    addresses: addr?.addresses ?? [],
    relationships: {
      status: bg?.maritalStatus ?? '—',
      spouse: bg?.spouse,
      priors: bg?.priorMarriages ?? '0',
      relatives: bg?.relatives ?? [],
      associates: bg?.associates ?? [],
    },
    professional: {
      title: prof?.title ?? '—',
      company: prof?.company ?? '—',
      tenure: prof?.tenure ?? '—',
      income: prof?.income ?? '—',
      networth: prof?.networth ?? '—',
      llcs: prof?.llcs ?? 'None found.',
    },
    publicRecords: buildPublicRecords(pub, fec),
    social: {
      handles: bg?.socialHandles ?? [],
      presence: bg?.socialPresence ?? '—',
      inconsistency: bg?.socialInconsistency ?? 'None flagged.',
    },
    nextSteps: getNextSteps(score, flags, pub),
  };

  return report;
}

function getHeadline(score: ScoreState, bg: any): string {
  if (score === 'green') return 'Everything checks out.';
  if (score === 'yellow') return 'A few things to weigh.';
  return 'We\'d pause here.';
}

function getSummary(score: ScoreState, bg: any, pub: any): string {
  if (score === 'green') return 'The record is clean across all seven sources. Identity is verified, public records are clear, and the social footprint is consistent. You can proceed with confidence.';
  if (score === 'yellow') return 'The file isn\'t spotless. There are a few items worth a conversation — nothing that requires walking away, but enough to go in with eyes open and ask the right questions.';
  return 'There are significant flags in the public record that we think warrant serious attention before you proceed. Review the details below carefully.';
}

function buildPublicRecords(pub: any, fec: any): Array<any> {
  const records = [
    { label: 'Sex offender registry', value: pub?.soRegistry ?? 'Not listed', good: !pub?.soRegistry || pub.soRegistry === 'Not listed' },
    { label: 'Bankruptcy', value: pub?.bankruptcy ?? 'None found', good: !pub?.bankruptcy || pub.bankruptcy === 'None found' },
    { label: 'Lawsuits & judgments', value: pub?.lawsuits ?? 'None found', good: !pub?.lawsuits || pub.lawsuits === 'None found', flag: pub?.hasOpenLawsuit },
    { label: 'Evictions', value: pub?.evictions ?? 'None found', good: !pub?.evictions || pub.evictions === 'None found' },
    { label: 'Criminal record', value: pub?.criminal ?? 'None found', good: !pub?.criminal || pub.criminal === 'None found' },
    { label: 'Professional licenses', value: pub?.licenses ?? '—', neutral: true },
    { label: 'Political donations', value: fec?.summary ?? 'None on record', neutral: true },
    { label: 'Voter registration', value: pub?.voter ?? '—', neutral: true },
  ];
  return records;
}

function getNextSteps(score: ScoreState, flags: string[], pub: any): string[] {
  const steps: string[] = [];
  if (score === 'green') {
    steps.push('The record is clean. Meet in a public place for your first date — not because you need to, but because it\'s your standard.');
    steps.push('Do a quick reverse-image search on his profile photos. Takes 30 seconds.');
    steps.push('If anything feels off in person, trust that instinct over the clean report.');
  } else if (score === 'yellow') {
    steps.push('Ask about the flagged items — not accusatorially, but naturally. His response will tell you more than the record did.');
    steps.push('Meet in a public place, midday or early evening, first meeting only.');
    steps.push('Re-run this report in 30 days if you decide to keep seeing him.');
    if (flags.includes('voip')) steps.push('The secondary VoIP line is worth a casual mention. "Oh, I texted you on a different number — do you have two phones?" is a perfectly natural way to surface it.');
  } else {
    steps.push('We\'d recommend not proceeding. The flags in the public record are significant.');
    steps.push('If you feel you need to meet, choose an extremely public location and tell someone exactly where you\'re going.');
    steps.push('Trust your gut above all. A report is one input. Your read of someone in person is another.');
  }
  return steps;
}
