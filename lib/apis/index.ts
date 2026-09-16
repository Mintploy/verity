import { SearchRequest, Report, ScoreState } from '../types';

import { lookupEnformion } from './enformion';
import { lookupPublicRecords } from './pacer';
import { lookupDonations } from './fec';
import { checkSexOffenderRegistry } from './nsopw';


/**
 * Reconciles the two address lists the report shows.
 *
 * They come from different products and disagreed on screen: the address
 * history's first entry is his most recently reported address, while the
 * property list was labelling its first record "Current address" purely by
 * array position. A woman reading both saw two different current addresses and
 * no way to tell which was true.
 *
 * Matching them settles it, and answers a second question at the same time.
 * PropertyV2 returns properties linked to a person, and being linked is not
 * the same as owning: an estate agent is linked to property he represents. So
 * the subject is only called an owner when his name is actually on the deed.
 */
function normalizeAddr(a: string): string {
  return (a ?? '')
    .toUpperCase()
    .replace(/[.,;#]/g, ' ')
    .replace(/\b(STREET|ST|AVENUE|AVE|BOULEVARD|BLVD|DRIVE|DR|ROAD|RD|LANE|LN|COURT|CT|PLACE|PL|TERRACE|TER)\b/g, '')
    .replace(/\b(APARTMENT|APT|UNIT|SUITE|STE|FLOOR|FL)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The house number plus the first word of the street, which is enough to pair. */
function addrKey(a: string): string {
  const n = normalizeAddr(a);
  const parts = n.split(' ').filter(Boolean);
  return parts.slice(0, 2).join(' ');
}

const OFFICE_MARKERS = /\b(STE|SUITE|FL|FLOOR|UNIT\s*[A-Z]?\d*\s*(OFFICE)?)\b/i;
const OFFICE_USE = /(COMMERCIAL|OFFICE|RETAIL|INDUSTRIAL|STORE|WAREHOUSE|PROFESSIONAL)/i;
const HOME_USE = /(SINGLE FAMILY|RESIDENTIAL|CONDOMINIUM|CONDO|DUPLEX|TOWNHOUSE|APARTMENT|MOBILE HOME)/i;

function classifyAddress(
  addr: string,
  prop?: { propertyType?: string; landUse?: string; propertyClass?: string },
): { kind: 'home' | 'office' | 'unknown'; reason?: string } {
  const use = [prop?.propertyType, prop?.landUse, prop?.propertyClass].filter(Boolean).join(' ');
  if (use && OFFICE_USE.test(use)) return { kind: 'office', reason: prop?.propertyType ?? prop?.landUse };
  if (use && HOME_USE.test(use)) return { kind: 'home', reason: prop?.propertyType ?? prop?.landUse };
  if (/\bSTE\b|\bSUITE\b|\bFLOOR\b|\bFL\s*\d/i.test(addr)) return { kind: 'office', reason: 'Suite number' };
  if (/\bAPT\b|\bAPARTMENT\b|\bUNIT\b/i.test(addr)) return { kind: 'home', reason: 'Apartment number' };
  return { kind: 'unknown' };
}

export async function generateReport(req: SearchRequest): Promise<Report> {
  const searchId = `VR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const [enResult, publicRecs, soRegistry] = await Promise.allSettled([
    lookupEnformion({
      phone: req.phone,
      name: req.name,
      email: req.email,
      address: req.address,
      location: req.location,
      tahoeId: req.tahoeId,
    }),
    lookupPublicRecords(req.name, req.phone),
    checkSexOffenderRegistry(req.name),
  ]);

  const en = enResult.status === 'fulfilled' ? enResult.value : null;
  const person = en?.person ?? {};
  const phone = en?.phone ?? null;

  // CourtListener searches by name. A phone or picker search has no name until
  // Enformion resolves one, so it never ran and the row said "None found".
  let pub: any = publicRecs.status === 'fulfilled' ? publicRecs.value : null;
  if (!req.name && person.fullName) {
    pub = await lookupPublicRecords(person.fullName).catch(() => null);
  }

  const flags: string[] = [];
  if (phone?.lineType === 'voip') flags.push('voip');
  if (pub?.hasFlags) flags.push('public');
  if (soRegistry.status === 'fulfilled' && soRegistry.value?.onRegistry) flags.push('soregistry');
  if (person.hasBankruptcy) flags.push('bankruptcy');
  if (person.hasEvictions) flags.push('evictions');
  if (person.hasJudgments || person.hasLiens || person.hasForeclosures) flags.push('financial');
  const criminal = person.criminal;
  const confirmedCriminal = criminal?.findings.filter(f => f.corroborated) ?? [];
  if (confirmedCriminal.length) flags.push('criminal');
  if (person.ofacHits?.length) flags.push('sanctions');

  // A registry listing, a criminal record, or a sanctions hit each stand on
  // their own, they are not one flag among several to be averaged away.
  const gravest = (soRegistry.status === 'fulfilled' && (soRegistry.value as any)?.onRegistry)
    || criminal?.onSexOffenderRegistry
    || confirmedCriminal.length > 0
    || !!person.ofacHits?.length;

  const score: ScoreState = gravest
    ? 'red'
    : flags.length >= 2
    ? 'yellow'
    : flags.length === 0
    ? 'green'
    : 'yellow';

  const so = soRegistry.status === 'fulfilled' ? soRegistry.value : null;
  const fecResult = await lookupDonations(person.fullName ?? req.name).catch(() => null);

  const resolvedName = person.fullName ?? req.name ?? 'Unknown';
  const resolvedAge = person.age ?? 0;
  const resolvedDob = person.dob ?? '';
  const resolvedAliases = person.aliases?.length ? person.aliases : undefined;

  const bizCount = person.counts?.business ?? 0;
  // The records themselves, one per line, when BusinessV2 returned them. A bare
  // count gave her nothing she could act on.
  const businessEntities = person.businessRecords?.length
    ? person.businessRecords.join('\n')
      + (bizCount > person.businessRecords.length ? `\n${bizCount - person.businessRecords.length} more on record` : '')
    : bizCount > 0
      ? `${bizCount} business record${bizCount === 1 ? '' : 's'} on file, but the business search ${person.businessChecked ? 'returned no details' : 'did not complete'} for this report.`
      : 'None found.';

  const publicRecords = buildPublicRecords(pub, fecResult, person, so);

  // An email address is not a social handle, and nothing here is confirmed:
  // these are addresses and profiles that appear on the record, which is a
  // weaker claim than "confirmed" and the only one we can actually make.
  const profiles: string[] = [];
  if (person.linkedInUrl) profiles.push(`LinkedIn: ${person.linkedInUrl}${person.linkedInHeadline ? ` · ${person.linkedInHeadline}` : ''}`);
  const emailsOnRecord: string[] = person.emails ?? [];

  // --- Reconcile the address history against the property records ---
  const rawProperties = person.propertyIntelligence ?? [];
  const rawAddresses = person.addresses ?? [];
  const currentAddr = rawAddresses.find(a => a.current)?.addr ?? rawAddresses[0]?.addr ?? '';
  const currentKey = currentAddr ? addrKey(currentAddr) : '';

  const subjectLast = (person.fullName ?? '').trim().split(/\s+/).pop()?.toUpperCase() ?? '';
  const subjectFirst = (person.fullName ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? '';

  const propByKey = new Map<string, typeof rawProperties[number]>();
  for (const pr of rawProperties) {
    const k = pr.address ? addrKey(pr.address) : '';
    if (k && !propByKey.has(k)) propByKey.set(k, pr);
  }

  // Ownership is decided once, for every property record wherever it came from.
  // Address history used to read the records before this ran, so "He owns it"
  // could never appear there.
  const withOwnership = (pr?: typeof rawProperties[number]) => {
    if (!pr) return undefined;
    const owners = (pr.ownerNames ?? []).map(o => o.toUpperCase());
    const subjectIsOwner = owners.length === 0
      ? undefined
      : owners.some(o => (!subjectLast || o.includes(subjectLast)) && (!subjectFirst || o.includes(subjectFirst)));
    return { ...pr, subjectIsOwner };
  };

  const enrichedProperties = rawProperties.map(pr => {
    const owners = (pr.ownerNames ?? []).map(o => o.toUpperCase());
    // Surname alone is too loose in a county full of relatives; require the
    // first name too when we have one to check against.
    const subjectIsOwner = owners.length === 0
      ? undefined
      : owners.some(o => (!subjectLast || o.includes(subjectLast))
        && (!subjectFirst || o.includes(subjectFirst)));
    return {
      ...pr,
      subjectIsOwner,
      inAddressHistory: !!(pr.address && rawAddresses.some(a => a.addr && addrKey(a.addr) === addrKey(pr.address))),
      isCurrentResidence: !!(currentKey && pr.address && addrKey(pr.address) === currentKey),
    };
  });

  const enrichedAddresses = rawAddresses.map((a, i) => {
    const match = withOwnership(a.addr ? (propByKey.get(addrKey(a.addr)) ?? person.addressProperties?.[a.addr]) : undefined);
    const { kind, reason } = classifyAddress(a.addr, match);
    return {
      ...a,
      ...(i === 0 && person.censusNeighborhood
        ? { detail: `${a.detail} · ${person.censusNeighborhood}` }
        : {}),
      kind,
      kindReason: reason,
      sqft: match?.sqft,
      yearBuilt: match?.yearBuilt,
      county: match?.county ?? a.county,
      beds: match?.beds,
      baths: match?.baths,
      lotSqft: match?.lotSqft,
      propertyType: match?.propertyType,
      purchasePrice: match?.purchasePrice,
      purchaseDate: match?.purchaseDate,
      currentValue: match?.currentValue,
      ownerName: match?.ownerName,
      subjectIsOwner: match?.subjectIsOwner,
      occupancy: match?.occupancy,
      ownershipType: match?.ownershipType,
      landUse: match?.landUse,
      propertyClass: match?.propertyClass,
      subdivision: match?.subdivision,
      apn: match?.apn,
      schoolDistrict: match?.schoolDistrict,
      owned: match?.subjectIsOwner === true ? true : a.owned,
    };
  });

  const report: Report = {
    id: searchId,
    searchId,
    score,
    headline: getHeadline(score),
    summary: getSummary(score, flags),
    confidence: person.fullName ? 96 : 88,
    sources: person.fullName ? 4 : 3,
    generatedAt: new Date().toISOString(),
    subject: {
      name: resolvedName,
      age: resolvedAge,
      // On a non-phone search the subject's own primary number is the result,
      // not the query.
      phone: req.phone ?? person.additionalPhones?.[0] ?? '',
      dob: resolvedDob,
    },
    phone: {
      carrier: phone?.carrier ?? '',
      lineType: phone?.lineType ?? 'mobile',
      voipFlag: phone?.voipFlag,
      numberAge: '',
      origin: phone?.origin ?? '',
      active: phone?.active ?? true,
    },
    identity: {
      fullName: resolvedName,
      age: resolvedAge,
      dob: resolvedDob,
      verifiedBy: person.fullName ? 4 : 3,
      aliases: resolvedAliases,
    },
    addresses: enrichedAddresses,
    propertyIntelligence: enrichedProperties,
    relationships: {
      // A marriage record proves a marriage happened, not that it is current,
      // so it is reported as a record rather than as "Married".
      status: person.maritalStatus
        ?? (person.marriageRecords?.length
          ? `${person.marriageNameMatched ? 'Possible marriage record, matched by name, verify' : 'Marriage record on file'}: ${person.marriageRecords[0]}`
          : person.marriageChecked ? 'No marriage record on file' : ''),
      spouse: person.spouseName,
      priors: person.divorceRecords?.length
        ? person.divorceRecords.join('; ')
        : person.priorMarriages
          ? person.priorMarriages
          : (person.marriageRecords?.length ?? 0) > 1
            ? `${person.marriageRecords!.length} marriage records on file: ${person.marriageRecords!.join('; ')}`
            : person.marriageChecked ? 'None on record' : 'Not available',
      relatives: person.relatives ?? [],
      relativesDetail: person.relativesDetail,
      associates: person.associates?.length
        ? person.associates
        : person.additionalPhones?.length
          ? [`Additional numbers on file: ${person.additionalPhones.join(', ')}`]
          : [],
    },
    professional: {
      // Enformion reports a workplace count but does not return the WorkPlace
      // array unless that include is entitled on the account. Say so rather
      // than showing a bare dash, which reads as "no employment on record".
      title: person.jobTitle ?? '',
      history: person.employmentHistory,
      company: person.company
        ?? ((person.counts?.workplace ?? 0) > 0 ? 'Employment on record, details not available' : ''),
      tenure: '',
      llcs: 'None found.',
      licenses: (person.counts?.licenses ?? 0) > 0
        ? `${person.counts!.licenses} professional license${person.counts!.licenses === 1 ? '' : 's'} on record`
        : '',
      businessEntities,
    },
    publicRecords,
    social: {
      handles: profiles,
      emails: emailsOnRecord,
      presence: profiles.length > 0
        ? 'A public profile appears on the record.'
        : emailsOnRecord.length > 0
          ? 'No public profile found. The addresses below appear on his record.'
          : 'No public profile found.',
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

// What each flag actually is, in the words the score was decided on. The score
// is computed from this exact list, so the summary can name the real reason
// rather than describing a generic one. It used to offer examples the code
// never checks, such as an address history contradicting what he told her,
// which is not something Verity looks at.
const FLAG_REASONS: Record<string, string> = {
  voip: 'his number is a VoIP line rather than a normal carrier mobile',
  public: 'an open federal court docket matches his name',
  bankruptcy: 'a bankruptcy filing is on his record',
  evictions: 'an eviction record is on file',
  financial: 'a judgment, lien or foreclosure is on file',
  criminal: 'a criminal record has been corroborated as his',
  sanctions: 'he appears on a sanctions or watchlist',
  soregistry: 'he appears on a sex offender registry',
};

function reasonList(flags: string[]): string {
  const parts = flags.map(f => FLAG_REASONS[f]).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function getSummary(score: ScoreState, flags: string[] = []): string {
  if (score === 'green') {
    return 'Nothing adverse surfaced in any of the checks that completed. That means the record is clean, not that he is, so keep your usual rules for a first meeting.';
  }
  const reasons = reasonList(flags);
  if (score === 'yellow') {
    return reasons
      ? `This came back yellow because ${reasons}. Nothing here forces a walk-away, but go in with eyes open and ask about it.`
      : 'Something surfaced that is worth a conversation before you meet. The detail is below.';
  }
  return reasons
    ? `This came back red because ${reasons}. That stands on its own, it is not averaged away against everything that came back clean.`
    : 'There are significant flags in the public record. Review the detail below carefully before you proceed.';
}

// Enformion's indicators are record counts, so report the count when we have
// one. "On file" without a number reads as vaguer than the data actually is.
function plural(count: number | undefined, noun: string): string {
  if (!count || count < 1) return 'None on file';
  return `${count} ${noun}${count === 1 ? '' : 's'} on file, details require further review`;
}

// A registry listing is the single most consequential thing this report can
// say, so it is never claimed clear on a check that did not run. Criminal
// Search V2 carries state sex offender registry records, which can confirm a
// listing even when NSOPW itself is unavailable, but it cannot prove absence,
// so a clean Criminal result still leaves the registry "not verified".
function buildRegistryRow(so: any, criminal: any): any {
  if (criminal?.onSexOffenderRegistry) {
    const hits = criminal.findings.filter((f: any) => f.sexOffender && f.corroborated);
    return {
      label: 'Sex offender registry',
      value: `Listed, ${hits[0]?.summary ?? 'registry record found'}`,
      good: false,
      flag: true,
    };
  }
  if (so?.checked) {
    return {
      label: 'Sex offender registry',
      value: so.onRegistry ? `Listed, ${so.details ?? 'record found'}` : 'Not listed',
      good: !so.onRegistry,
      flag: !!so.onRegistry,
    };
  }
  const nameOnlySex = (criminal?.findings ?? []).filter((f: any) => f.sexOffender && !f.corroborated);
  if (nameOnlySex.length) {
    return {
      label: 'Sex offender registry',
      value: 'A sex offender record matches his name but could not be confirmed as him. Verify at nsopw.gov before relying on this.',
      neutral: true,
    };
  }
  // Criminal Search V2 carries sex offender records (category SEX), so a search
  // that completed answers this even without NSOPW access.
  if (criminal?.checked) {
    return {
      label: 'Sex offender registry',
      value: 'Not listed. No sex offender records found in the criminal records search.',
      good: true,
    };
  }
  return {
    label: 'Sex offender registry',
    value: 'Not checked. The criminal records search did not complete for this report.',
    neutral: true,
  };
}

// Criminal Search V2 matches on name alone, so an uncorroborated hit means
// "someone with this name has a record", not "he does". Presenting the two as
// the same thing would risk pinning a stranger's conviction on the person being
// searched. Corroborated records are stated plainly; name-only matches are
// shown as needing verification and are never counted as a confirmed finding.
function buildCriminalRow(criminal: any): any {
  const confirmed = criminal?.findings?.filter((f: any) => f.corroborated) ?? [];
  if (confirmed.length) {
    // One line per record, each with what kind it is and the court detail
    // behind it, rather than five copies of the same summary string.
    return {
      label: 'Criminal records',
      value: `${confirmed.length} record${confirmed.length === 1 ? '' : 's'} on file`,
      good: false,
      flag: true,
      images: confirmed.map((f: any) => f.imageUrl).filter(Boolean),
      details: confirmed.map((f: any) => ({
        text: [f.summary, f.detail].filter(Boolean).join(' | '),
      })),
      detailTags: confirmed.map((f: any) => f.category ?? 'Record'),
    };
  }
  if (criminal?.nameOnlyMatches) {
    return {
      label: 'Criminal records',
      value: `${criminal.findings.length} record${criminal.findings.length === 1 ? '' : 's'} match the name but could not be confirmed as this person, verify before relying on this`,
      neutral: true,
    };
  }
  // Empty findings from a search that never ran are not a clean record. Saying
  // "None found" here is what every report did while the plan lacked access.
  if (!criminal?.checked) {
    return {
      label: 'Criminal records',
      value: 'Not checked. The criminal records search did not complete for this report, so this is unknown, not clear.',
      neutral: true,
    };
  }
  return { label: 'Criminal records', value: 'None found', good: true };
}

function buildPublicRecords(pub: any, fec: any, person: any, so?: any): Array<any> {
  const records = [
    // A failed check must never render as "Not listed", that is a false
    // assurance. Only claim the registry is clear when it was actually searched.
    buildRegistryRow(so, person?.criminal),
    !pub?.checked
      ? { label: 'Federal lawsuits', value: 'Not checked. The federal court search did not complete for this report.', neutral: true }
      : pub.dockets?.length
        ? {
            label: 'Federal lawsuits',
            value: `${pub.lawsuits}. Matched by name, so confirm each case is him before relying on it.`,
            flag: !!pub.hasOpenLawsuit,
            neutral: !pub.hasOpenLawsuit,
            details: pub.dockets.map((d: any) => ({
              text: [d.caseName, d.court, d.dateFiled ? `filed ${d.dateFiled}` : '', d.dateTerminated ? `closed ${d.dateTerminated}` : 'open', d.suitNature, d.docketNumber ? `no. ${d.docketNumber}` : '']
                .filter(Boolean).join(' · '),
              href: d.url,
            })),
          }
        : { label: 'Federal lawsuits', value: 'None found', good: true },
    { label: 'Bankruptcy filings', value: plural(person?.counts?.bankruptcy, 'filing'), good: !person?.hasBankruptcy, flag: !!person?.hasBankruptcy },
    person?.evictionRecords?.length
      ? { label: 'Eviction records', value: person.evictionRecords.join(' | '), good: false, flag: true }
      : { label: 'Eviction records', value: plural(person?.counts?.evictions, 'record'), good: !person?.hasEvictions, flag: !!person?.hasEvictions },
    ...(person?.foreclosureRecords?.length
      ? [{ label: 'Pre-foreclosure', value: person.foreclosureRecords.join(' | '), good: false, flag: true }]
      : []),
    { label: 'Judgments / liens', value: plural((person?.counts?.judgments ?? 0) + (person?.counts?.liens ?? 0), 'record'), good: !person?.hasJudgments && !person?.hasLiens, flag: !!(person?.hasJudgments || person?.hasLiens) },
    buildCriminalRow(person?.criminal),
    person?.ofacHits?.length
      ? { label: 'Sanctions / watchlists', value: person.ofacHits.join(' | '), good: false, flag: true }
      : person?.ofacChecked
        ? { label: 'Sanctions / watchlists', value: 'Not listed', good: true }
        : { label: 'Sanctions / watchlists', value: 'Not checked. The sanctions search did not complete for this report.', neutral: true },
    { label: 'Political donations', value: fec?.summary ?? 'None on record', neutral: true },
  ];
  return records;
}

function getNextSteps(score: ScoreState, flags: string[]): string[] {
  const steps: string[] = [];
  if (score === 'green') {
    steps.push('The record is clean. Meet in a public place for your first date, not because you need to, but because it\'s your standard.');
    steps.push('Do a quick reverse-image search on his profile photos. Takes 30 seconds.');
    steps.push('If anything feels off in person, trust that instinct over the clean report.');
  } else if (score === 'yellow') {
    steps.push('Ask about the flagged items naturally. His response will tell you more than the record did.');
    steps.push('Meet in a public place, midday or early evening, first meeting only.');
    steps.push('Re-run this report in 30 days if you decide to keep seeing him.');
    if (flags.includes('voip')) steps.push('The VoIP number is worth a casual mention, "do you have two phones?" is a natural way to surface it.');
  } else {
    steps.push('We\'d recommend not proceeding. The flags in the public record are significant.');
    steps.push('If you feel you need to meet, choose an extremely public location and tell someone exactly where you\'re going.');
    steps.push('Trust your gut above all.');
  }
  return steps;
}
