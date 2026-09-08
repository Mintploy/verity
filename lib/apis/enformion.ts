// Enformion — comprehensive people intelligence API
// Auth: galaxy-ap-name / galaxy-ap-password headers + galaxy-search-type
// Env vars: ENFORMION_USERNAME (galaxy-ap-name), ENFORMION_PASSWORD (galaxy-ap-password)
// Base endpoint: POST https://devapi.enformion.com/PersonSearch

// devapi.enformion.com is the correct API host and serves LIVE data despite the
// name — confirmed against a real production response. Do not point
// ENFORMION_HOST at enformion.com or api.enformion.com: those serve the web
// portal and return an HTML login page, not JSON. The override exists only in
// case Enformion issues a different API host.
const HOST = (process.env.ENFORMION_HOST ?? 'https://devapi.enformion.com').replace(/\/+$/, '');

const BASE_URL = `${HOST}/PersonSearch`;
const PROPERTY_URL = `${HOST}/PropertyV2Search`;
const DIVORCE_URL = `${HOST}/DivorceSearch`;
const PHONE_URL = `${HOST}/ReversePhoneSearch`;
const LINKEDIN_URL = `${HOST}/LinkedIn/Id`;
const CENSUS_URL = `${HOST}/CensusSearch`;

// Detail products. Person Search's `indicators` say what exists; these
// endpoints return the records themselves. Criminal and OFAC have no indicator
// and are queried directly.
const CRIMINAL_URL = `${HOST}/CriminalSearch/V2`;
const OFAC_URL = `${HOST}/OfacSearch`;
const WORKPLACE_URL = `${HOST}/WorkplaceSearch`;

// galaxy-search-type values.
//
// The search type is scoped to the endpoint, not global. /PersonSearch accepts
// four tiers — Person and ReversePhonePerson (full detail, paying users),
// Teaser and ReversePhonePersonTeaser (masked, logged-out). Those four belong
// to /PersonSearch ONLY. /ReversePhoneSearch takes "ReversePhone"; sending
// ReversePhonePerson there returns 400 "Search Type is not valid for requested
// endpoint", verified in production 2026-09-08.
//
// Detail level is not lost by using the plain ReversePhone type here: this call
// exists only to turn a number into a TahoeId, and personSearchById then
// re-fetches the full record with the paid Person type.
const SEARCH_TYPE_PERSON = 'Person';
const SEARCH_TYPE_PHONE = 'ReversePhone';
const SEARCH_TYPE_PROPERTY = 'PropertyV2';
const SEARCH_TYPE_DIVORCE = 'Divorce';
// Documented as "LinkedinID" (enformiongo.readme.io/reference/linkedin-id).
// The code sent "LinkedIn", which is why this endpoint answered 400.
const SEARCH_TYPE_LINKEDIN = 'LinkedinID';
const SEARCH_TYPE_CENSUS = 'Census';
const SEARCH_TYPE_CRIMINAL = 'CriminalV2';
const SEARCH_TYPE_OFAC = 'Ofac';
const SEARCH_TYPE_WORKPLACE = 'Workplace';

export interface EnformionPhone {
  lineType: 'mobile' | 'voip' | 'landline';
  carrier?: string;
  voipFlag?: string;
  origin: string;
  active: boolean;
}

export interface EnformionAddress {
  addr: string;
  years: string;
  current: boolean;
  detail: string;
  flag?: boolean;
}

export interface EnformionProperty {
  address: string;
  ownerName?: string;
  ownerType?: string;
  purchasePrice?: string;
  purchaseDate?: string;
  yearsOwned?: string;
  currentValue?: string;
  estimatedRent?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
}

export interface EnformionPerson {
  tahoeId?: string;
  fullName?: string;
  age?: number;
  dob?: string;
  aliases?: string[];
  addresses?: EnformionAddress[];
  relatives?: string[];
  associates?: string[];
  emails?: string[];
  jobTitle?: string;
  company?: string;
  additionalPhones?: string[];
  maritalStatus?: string;
  spouseName?: string;
  priorMarriages?: string;
  propertyIntelligence?: EnformionProperty[];
  // Indicator flags (count > 0 means records exist; details via separate lookup)
  hasBankruptcy?: boolean;
  hasEvictions?: boolean;
  hasForeclosures?: boolean;
  hasJudgments?: boolean;
  hasLiens?: boolean;
  hasBusinessRecords?: boolean;
  hasDivorceRecords?: boolean;
  hasPropertyRecords?: boolean;
  linkedInUrl?: string;
  linkedInHeadline?: string;
  censusNeighborhood?: string;
  criminal?: CriminalResult;
  ofacHits?: string[];
  marriageRecords?: string[];
  divorceRecords?: string[];
  vehicles?: string[];
  /** Record counts from Enformion's `indicators` object (they are counts, not flags). */
  counts?: EnformionCounts;
}

export interface EnformionCounts {
  bankruptcy: number;
  evictions: number;
  foreclosures: number;
  judgments: number;
  liens: number;
  business: number;
  divorce: number;
  marriage: number;
  property: number;
  vehicles: number;
  licenses: number;
  debt: number;
  workplace: number;
}

export interface EnformionResult {
  phone: EnformionPhone;
  person: EnformionPerson;
}

function classifyLineType(raw: string): 'mobile' | 'voip' | 'landline' {
  const t = raw.toLowerCase();
  if (t.includes('voip')) return 'voip';
  if (t.includes('wireless')) return 'mobile';
  if (t.includes('landline') || t.includes('land line') || t.includes('services')) return 'landline';
  return 'mobile';
}

function buildName(obj: { firstName?: string; middleName?: string; lastName?: string }): string {
  return [obj.firstName, obj.middleName, obj.lastName].filter(Boolean).join(' ');
}

function birthYearToApproxAge(dobStr: string): number | null {
  // Enformion DOB format: "1/XX/1964" — only year is reliable
  const parts = dobStr.split('/');
  const year = parseInt(parts[parts.length - 1]);
  if (!year || year < 1900) return null;
  return new Date().getFullYear() - year;
}

// An HTML body means the request reached a web server rather than the API —
// almost always a misconfigured ENFORMION_HOST. Say that plainly instead of
// dumping a login page into the logs.
function failureSummary(status: number, body: string): string {
  const trimmed = body.trimStart();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return `${status} — received an HTML page, not JSON. ENFORMION_HOST (${HOST}) is not an API host; unset it to use the default.`;
  }
  return `${status} ${body.slice(0, 800)}`;
}

const byPhoneOrder = (a: any, b: any) => (a.phoneOrder ?? 999) - (b.phoneOrder ?? 999);

function findPhone(person: any, digits: string): any | undefined {
  return (person?.phoneNumbers ?? []).find(
    (p: any) => (p.phoneNumber ?? '').replace(/\D/g, '') === digits
  );
}

// A number can appear on several people's records. phoneOrder ranks a number
// within one person's own list, so the record where the searched number ranks
// best is the one that actually owns it.
function pickBestMatch(results: any[], digits: string): any {
  let best = results[0];
  let bestOrder = Infinity;
  for (const r of results) {
    const hit = findPhone(r, digits);
    if (!hit) continue;
    const order = hit.phoneOrder ?? 999;
    if (order < bestOrder) {
      bestOrder = order;
      best = r;
    }
  }
  return best;
}

// Reads a detail array only if the response actually carries one. Returns []
// rather than inventing a placeholder when the include is absent or unentitled.
function readDetailList(raw: any, format: (row: any) => string, limit: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit).map(format).filter(Boolean);
}

// Calls one of the detail endpoints and logs the response's actual key names.
// The docs host is unreachable from the build environment, so the shapes below
// are inferred from the confirmed Person Search pattern; ENFORMION_SHAPE lines
// in production report the real keys so the parsers can be pinned to them.
// Enformion is not consistent about the collection key. Person Search answers
// under `persons`; other endpoints use `results`; ReversePhoneSearch and
// CriminalSearch use their own names and pass explicit extractors.
//
// Reading only `results` silently discarded fully populated responses. That is
// the same fault that produced ENFORMION_EMPTY[BYID] while the body plainly
// carried the person's age, DOB dates and AKAs, and it is why the report could
// show a name and nothing else.
//
// This is a superset, so a `results`-shaped body still resolves exactly as
// before — no endpoint loses behaviour by adopting it.
function extractRowsDefault(data: any): any[] {
  if (Array.isArray(data)) return data;
  return data?.persons ?? data?.Persons ?? data?.results ?? data?.Results ?? [];
}

async function proSearch(
  username: string,
  password: string,
  url: string,
  searchType: string,
  body: Record<string, unknown>,
  label: string,
  extractRows?: (data: any) => any[],
): Promise<any[]> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(username, password, searchType),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.log(`ENFORMION_${label}_ERROR:`, failureSummary(res.status, errText));
      return [];
    }

    const data = await res.json();
    const rows: any[] = extractRows
      ? (extractRows(data) ?? [])
      : extractRowsDefault(data);
    console.log(`ENFORMION_${label}_RESULTS:`, rows.length);
    if (rows[0]) {
      console.log(`ENFORMION_SHAPE[${label}]:`, Object.keys(rows[0]).join(','));
      // Key names alone do not say whether a section will populate: an empty
      // addresses[] and a missing one look identical in SHAPE. Report each
      // array's length and whether each scalar is set, so a genuinely thin
      // record is distinguishable from a parse failure. Counts and presence
      // only — no values, so this logs no personal data.
      console.log(`ENFORMION_CENSUS[${label}]:`, Object.entries(rows[0])
        .map(([k, v]) => Array.isArray(v)
          ? `${k}:${v.length}`
          : (v === null || v === '' || v === undefined ? `${k}:-` : `${k}:set`))
        .join(' '));
    } else if (!Array.isArray(data)) {
      // A 200 with no rows may still carry a message, a counts block, or a
      // pagination total explaining why. Surface it instead of discarding it.
      console.log(`ENFORMION_EMPTY[${label}]:`, JSON.stringify(data).slice(0, 2000));
    }
    return rows;
  } catch (e: any) {
    console.log(`ENFORMION_${label}_EXCEPTION:`, String(e), e?.cause ? `| ${String(e.cause)}` : '');
    return [];
  }
}

// Picks the first non-empty value among candidate keys, case-insensitively.
// Used only until ENFORMION_SHAPE logs confirm each endpoint's real key names.
function pick(row: any, ...keys: string[]): string | undefined {
  if (!row) return undefined;
  const lower: Record<string, any> = {};
  for (const k of Object.keys(row)) lower[k.toLowerCase()] = row[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

function yearOf(raw?: string): string | null {
  if (!raw) return null;
  const y = new Date(raw).getFullYear();
  return Number.isFinite(y) && y > 1900 ? String(y) : null;
}

// Only the documented galaxy-* headers. An Authorization: Basic header was
// also being sent; Enformion's spec never asks for one, and an unexpected
// credential can resolve to a different (unentitled) identity that answers 200
// with an empty result set — which is exactly the symptom seen.
function makeHeaders(username: string, password: string, searchType?: string) {
  return {
    'galaxy-ap-name': username,
    'galaxy-ap-password': password,
    ...(searchType ? { 'galaxy-search-type': searchType } : {}),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export interface EnformionQuery {
  phone?: string;
  name?: string;
  email?: string;
  address?: string;
  /** City, State or ZIP — narrows a name or address search. */
  location?: string;
}

export async function lookupEnformion(query: EnformionQuery): Promise<EnformionResult> {
  const { name, email, address, location } = query;
  const liveAllowed = process.env.ALLOW_LIVE_LOOKUPS === 'true';
  const username = process.env.ENFORMION_USERNAME;
  const password = process.env.ENFORMION_PASSWORD;

  if (!liveAllowed || !username || !password) {
    return { phone: emptyPhone(), person: {} };
  }

  const raw = (query.phone ?? '').replace(/\D/g, '');
  const cleaned = raw.length === 11 && raw.startsWith('1') ? raw.slice(1) : raw;

  // Includes available on an initial (identifier-less) search.
  const CORE_INCLUDES = [
    'Akas',
    'Addresses',
    'PhoneNumbers',
    'EmailAddresses',
    'DatesOfBirth',
    'DatesOfDeath',
    'DeathRecords',
    'WorkPlace',
    'RelativesSummary',
    'AssociatesSummary',
    'Indicators',
  ];

  // Drill-down includes. Enformion rejects these without a unique identifier
  // ("Unique identifiers must be provided for the requested includes"), so they
  // are requested in a second call keyed on the TahoeId from the first.
  const DETAIL_INCLUDES = ['Criminal', 'Marriage', 'Divorce', 'VehicleRegistrations'];

  const nameParts = name?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

  // Search variants, tried in order until one returns rows.
  //
  // A phone or an email is a unique identifier and may carry Includes. A name
  // is not: pairing one with Includes returns 400 "Unique identifiers must be
  // provided for the requested includes", so name and address variants go bare
  // and the full record is fetched afterwards by TahoeId.
  //
  // Combining criteria ANDs them, so each is tried alone before any pairing.
  const variants: Array<{ label: string; body: Record<string, unknown>; includes?: string[] }> = [];

  if (cleaned) variants.push({ label: 'phone', body: { Phone: cleaned } });
  if (email) variants.push({ label: 'email', body: { Email: email } });

  if (address) {
    // Person Search takes addresses as an array of objects; AddressLine2 is the
    // "City, State" (or ZIP) half.
    variants.push({
      label: 'address',
      body: { Addresses: [{ AddressLine1: address, ...(location ? { AddressLine2: location } : {}) }] },
      includes: [],
    });
  }

  if (firstName && lastName) {
    variants.push({
      label: 'name',
      body: {
        FirstName: firstName,
        LastName: lastName,
        ...(location ? { Addresses: [{ AddressLine2: location }] } : {}),
      },
      includes: [],
    });
    // Pairing is a last resort — it only helps when a lone criterion is too broad.
    if (cleaned) {
      variants.push({ label: 'phone+name', body: { Phone: cleaned, FirstName: firstName, LastName: lastName } });
    }
  } else if (firstName) {
    variants.push({ label: 'firstname', body: { FirstName: firstName }, includes: [] });
  }

  try {
    // Step 1 — Reverse Phone Search is the documented product for turning a
    // number into the people on it ("returns all individuals associated with a
    // provided phone number"). Person Search's `Person` type answers 200 with
    // zero rows for a Phone criterion even where data demonstrably exists, so
    // the phone lookup belongs here, not there.
    const rpRows = cleaned ? await reversePhone(username, password, cleaned) : [];
    let results: any[] = rpRows.filter((r: any) => r && (r.tahoeId || r.name || r.fullName));

    // Step 2 — Re-fetch the match by TahoeId. Includes require a unique
    // identifier, and a TahoeId is one, so this is where the full record
    // (addresses, relatives, indicators) legitimately comes from.
    const seed = results.length ? pickBestMatch(results, cleaned) : null;
    if (seed?.tahoeId) {
      const full = await personSearchById(username, password, seed.tahoeId, CORE_INCLUDES);
      if (full) results = [full];
    }

    // Step 3 — Fall back to Person Search only if the phone path found nobody.
    for (const variant of results.length ? [] : variants) {
      const inc = variant.includes ?? CORE_INCLUDES;
      const body: Record<string, unknown> = {
        ...variant.body,
        ...(inc.length ? { Includes: inc } : {}),
        FilterOptions: ['IncludeLowQualityAddresses'],
        ResultsPerPage: 5,
      };

      console.log(`ENFORMION_TRY[${variant.label}]:`, JSON.stringify(body));
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: makeHeaders(username, password, SEARCH_TYPE_PERSON),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.log(`ENFORMION_ERROR[${variant.label}]:`, failureSummary(res.status, errText));
        continue;
      }

      const data = await res.json();
      const got: any[] = extractRowsDefault(data);
      console.log(`ENFORMION_RESULTS[${variant.label}]:`, got.length);
      if (got.length) {
        results = got;
        break;
      }
    }

    if (!results.length) {
      console.log('ENFORMION_NO_RESULTS: reverse-phone and all Person Search variants empty for', cleaned);
      return { phone: emptyPhone(), person: {} };
    }

    // A number can sit on several people's records (a shared office line, a
    // household). phoneOrder ranks a number within one person's own list, so
    // the record where the searched number ranks best is its real owner.
    const best = pickBestMatch(results, cleaned);
    console.log('ENFORMION_MATCH:', best?.fullName, 'of', results.length, 'results');

    // --- Phone intelligence ---
    // Prefer carrier/line-type off the reverse-phone row for the searched
    // number; fall back to the PhoneNumbers include on the person record.
    let phoneResult: EnformionPhone = emptyPhone();
    const rpMatch = rpRows.map((r: any) => findPhone(r, cleaned)).find(Boolean)
      ?? rpRows.find((r: any) => (r?.phoneNumber ?? '').replace(/\D/g, '') === cleaned);
    if (rpMatch) {
      const lineType = classifyLineType(rpMatch.phoneType ?? rpMatch.lineType ?? '');
      phoneResult = {
        lineType,
        carrier: rpMatch.company ?? rpMatch.carrier ?? undefined,
        voipFlag: lineType === 'voip'
          ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.'
          : undefined,
        origin: 'United States',
        active: rpMatch.isConnected !== false,
      };
    }
    // Fallback: phone data from the PhoneNumbers include on the person record
    if (phoneResult.lineType === 'mobile' && !phoneResult.carrier) {
      const matchedPhone = findPhone(best, cleaned)
        ?? [...(best.phoneNumbers ?? [])].sort(byPhoneOrder)[0];
      if (matchedPhone) {
        const lineType = classifyLineType(matchedPhone.phoneType ?? '');
        phoneResult = {
          lineType,
          carrier: matchedPhone.company ?? undefined,
          voipFlag: lineType === 'voip'
            ? 'This is a VoIP number — not tied to a physical carrier. VoIP numbers are easy to create anonymously and are often used as secondary or burner lines.'
            : undefined,
          origin: 'United States',
          // isConnected is the line's own status. The top-level person record
          // carries no deathRecords object (only nested associates do), so the
          // subject's status comes from datesOfDeath instead.
          active: matchedPhone.isConnected !== false,
        };
      }
    }

    // --- Identity ---
    const fullName: string | undefined = best.fullName
      ?? (best.name ? buildName(best.name) : undefined);
    const age: number | undefined = best.age ?? undefined;

    // With DateOfBirth include enabled, datesOfBirth may now have actual dates
    const dobRecord = (best.datesOfBirth ?? [])[0];
    const dobRaw: string | undefined = (best.dob && best.dob !== '')
      ? best.dob
      : dobRecord?.dob ?? dobRecord?.DateOfBirth ?? dobRecord?.dateOfBirth ?? undefined;

    const phoneNumbers: any[] = best.phoneNumbers ?? [];

    const aliases: string[] = (best.akas ?? [])
      .map((a: any) => buildName(a))
      .filter(Boolean)
      .filter((n: string) => n !== fullName);

    // --- Addresses ---
    const rawAddresses: any[] = best.addresses ?? [];
    const sortedAddresses = [...rawAddresses]
      .sort((a: any, b: any) => (a.addressOrder ?? 999) - (b.addressOrder ?? 999))
      .slice(0, 8);

    const addresses: EnformionAddress[] = sortedAddresses.map((a: any, i: number) => {
      const addr = a.fullAddress ?? '';
      const isCurrent = i === 0;
      const fromRaw = a.firstReportedDate ?? null;
      const toRaw = a.lastReportedDate ?? null;
      let years = isCurrent ? 'Current' : 'Previous address';
      if (fromRaw) {
        const fromYear = new Date(fromRaw).getFullYear();
        if (isCurrent) {
          years = `Since ${fromYear}`;
        } else if (toRaw) {
          const toYear = new Date(toRaw).getFullYear();
          years = fromYear === toYear ? String(fromYear) : `${fromYear}–${toYear}`;
        } else {
          years = `From ${fromYear}`;
        }
      }
      return {
        addr,
        years,
        current: isCurrent,
        detail: isCurrent ? 'Current address' : 'Previous address',
        flag: !!(a.highRiskMarker?.isHighRisk),
      };
    }).filter((a: any) => a.addr);

    // --- Employment (WorkPlace include) ---
    const workplaces: any[] = best.workPlace ?? best.workplaceSummary ?? best.WorkPlace ?? [];
    const currentJob = workplaces.find(
      (w: any) => w.isCurrent ?? w.IsCurrent ?? w.is_current
    ) ?? workplaces[0];
    const jobTitle: string | undefined = currentJob?.position ?? currentJob?.Position
      ?? currentJob?.title ?? currentJob?.Title ?? currentJob?.jobTitle ?? undefined;
    const company: string | undefined = currentJob?.employer ?? currentJob?.Employer
      ?? currentJob?.company ?? currentJob?.Company ?? undefined;

    // --- Relatives + spouse detection ---
    const relativesSummary: any[] = best.relativesSummary ?? [];

    const isSpouse = (r: any) => r.relativeType === 'Spouse' || r.spouse === 1;
    const currentSpouse = relativesSummary.find(
      (r: any) => isSpouse(r) && !r.oldSpouse && !r.isDeceased
    );
    const spouseName: string | undefined = currentSpouse ? buildName(currentSpouse) : undefined;

    const priorSpouses = relativesSummary.filter((r: any) => r.oldSpouse === true);
    const priorMarriages: string | undefined = priorSpouses.length > 0
      ? `${priorSpouses.length} prior marriage${priorSpouses.length !== 1 ? 's' : ''} on record`
      : undefined;

    const maritalStatus: string | undefined = spouseName
      ? 'Married'
      : priorSpouses.length > 0
        ? 'Divorced / previously married'
        : undefined;

    const relatives: string[] = relativesSummary
      .filter((r: any) => !isSpouse(r))
      .slice(0, 10)
      .map((r: any) => {
        const rName = buildName(r);
        const approxAge = r.dob ? birthYearToApproxAge(r.dob) : null;
        return approxAge ? `${rName} (approx. ${approxAge})` : rName;
      })
      .filter(Boolean);

    // --- Associates ---
    const associates: string[] = (best.associatesSummary ?? [])
      .slice(0, 8)
      .map((a: any) => buildName(a))
      .filter(Boolean);

    // --- Additional phones ---
    const additionalPhones: string[] = phoneNumbers
      .filter((p: any) => (p.phoneNumber ?? '').replace(/\D/g, '') !== cleaned)
      .sort((a: any, b: any) => (a.phoneOrder ?? 999) - (b.phoneOrder ?? 999))
      .slice(0, 3)
      .map((p: any) => `${p.phoneNumber} (${p.phoneType ?? 'unknown'})`);

    // --- Emails (personal only) ---
    const emails: string[] = (best.emailAddresses ?? [])
      .filter((e: any) => e.nonBusiness === 1)
      .map((e: any) => e.emailAddress)
      .filter((e: any) => typeof e === 'string' && e.includes('@'))
      .slice(0, 3);

    // --- Indicators ---
    // These are record COUNTS, not booleans (e.g. hasBusinessRecords: 17), so
    // the counts are kept and surfaced rather than flattened to yes/no.
    const ind = best.indicators ?? {};
    const n = (k: string): number => Number(ind[k] ?? 0) || 0;

    const counts = {
      bankruptcy: n('hasBankruptcyRecords'),
      evictions: n('hasEvictionsRecords'),
      foreclosures: n('hasForeclosuresRecords') + n('hasForeclosuresV2Records'),
      judgments: n('hasJudgmentRecords'),
      liens: n('hasLienRecords'),
      business: n('hasBusinessRecords'),
      divorce: n('hasDivorceRecords'),
      marriage: n('hasMarriageRecords'),
      property: n('hasPropertyV2Records') || n('hasPropertyRecords'),
      vehicles: n('hasVehicleRegistrationsRecords'),
      licenses: n('hasProfessionalLicenseRecords'),
      debt: n('hasDebtRecords'),
      workplace: n('hasWorkplaceRecords'),
    };

    const hasBankruptcy = counts.bankruptcy > 0;
    const hasEvictions = counts.evictions > 0;
    const hasForeclosures = counts.foreclosures > 0;
    const hasJudgments = counts.judgments > 0;
    const hasLiens = counts.liens > 0;
    const hasBusinessRecords = counts.business > 0;
    const hasDivorceRecords = counts.divorce > 0;
    const hasPropertyRecords = counts.property > 0;

    // A verified production response carries no criminal / marriage /
    // vehicleRegistrations arrays even when the corresponding Includes are
    // requested, and `indicators` has no criminal counter at all — criminal
    // appears to be a separate product. Detail arrays are read only if a
    // response ever does carry them; otherwise the counts above are all we
    // legitimately know, and nothing is invented to fill the gap.
    const marriageRecords: string[] = readDetailList(best.marriage, (m: any) => {
      const spouse = buildName(m.spouse ?? m);
      const year = m.marriageDate ?? m.date;
      return [spouse || 'Marriage on record', year ? new Date(year).getFullYear() : null, m.county ?? m.state]
        .filter(Boolean).join(' · ');
    }, 3);

    const inlineDivorce: string[] = readDetailList(best.divorce, (d: any) => {
      const year = d.divorceDate ?? d.date;
      return [year ? new Date(year).getFullYear() : 'Divorce on record', d.county ?? d.state]
        .filter(Boolean).join(' · ');
    }, 3);

    const vehicles: string[] = readDetailList(best.vehicleRegistrations, (v: any) =>
      [v.modelYear ?? v.year, v.make, v.model, v.color ? `(${v.color})` : '']
        .filter(Boolean).join(' '), 4);

    // --- Detail lookups (parallel) ---
    // Where an indicator exists it gates the call, so we only spend a request
    // when Person Search has already said there is something to fetch.
    // Criminal and OFAC have no indicator and are always queried.
    const [
      propertyIntelligence, divorceDetail, linkedInResult, censusResult,
      criminalRecords, ofacHits, workplace,
    ] = await Promise.all([
      counts.property > 0
        ? lookupPropertyV2(username, password, best.tahoeId, addresses[0]?.addr, fullName).catch(() => [])
        : Promise.resolve([] as EnformionProperty[]),
      hasDivorceRecords && inlineDivorce.length === 0
        ? lookupDivorce(username, password, best.tahoeId, fullName).catch(() => null)
        : Promise.resolve(null),
      best.tahoeId
        ? lookupLinkedIn(username, password, best.tahoeId).catch(() => null)
        : Promise.resolve(null),
      addresses[0]?.addr
        ? lookupCensus(username, password, addresses[0].addr).catch(() => null)
        : Promise.resolve(null),
      lookupCriminal(username, password, fullName, {
        age,
        states: (best.addresses ?? []).map((a: any) => a.state).filter(Boolean),
      }).catch(() => ({ findings: [], onSexOffenderRegistry: false, nameOnlyMatches: false })),
      lookupOfac(username, password, fullName).catch(() => []),
      counts.workplace > 0
        ? lookupWorkplace(username, password, best.tahoeId, fullName).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      phone: phoneResult,
      person: {
        tahoeId: best.tahoeId,
        fullName,
        age,
        dob: dobRaw,
        aliases,
        addresses,
        relatives,
        associates,
        emails,
        jobTitle: jobTitle ?? workplace?.title,
        company: company ?? workplace?.company,
        additionalPhones,
        maritalStatus,
        spouseName,
        priorMarriages: divorceDetail ?? priorMarriages,
        propertyIntelligence,
        hasBankruptcy,
        hasEvictions,
        hasForeclosures,
        hasJudgments,
        hasLiens,
        hasBusinessRecords,
        hasDivorceRecords,
        hasPropertyRecords,
        linkedInUrl: linkedInResult?.url,
        linkedInHeadline: linkedInResult?.headline,
        censusNeighborhood: censusResult?.neighborhood,
        counts,
        criminal: criminalRecords,
        ofacHits: ofacHits.length ? ofacHits : undefined,
        marriageRecords: marriageRecords.length ? marriageRecords : undefined,
        divorceRecords: inlineDivorce.length ? inlineDivorce : divorceDetail ? [divorceDetail] : undefined,
        vehicles: vehicles.length ? vehicles : undefined,
      },
    };
  } catch (e: any) {
    const cause = e?.cause ?? e?.reason;
    console.log('ENFORMION_ERROR:', String(e), cause ? `| cause: ${String(cause)}` : '');
    return { phone: emptyPhone(), person: {} };
  }
}

async function lookupPropertyV2(
  username: string,
  password: string,
  tahoeId?: string,
  currentAddress?: string,
  fullName?: string,
): Promise<EnformionProperty[]> {
  if (!tahoeId && !currentAddress) return [];

  const body: Record<string, unknown> = { ResultsPerPage: 3 };
  if (tahoeId) {
    body.TahoeId = tahoeId;
  } else if (currentAddress && fullName) {
    const nameParts = fullName.trim().split(' ');
    body.FirstName = nameParts[0];
    body.LastName = nameParts.slice(1).join(' ');
    // Split address into line1 / line2 at the city boundary (after first comma)
    const commaIdx = currentAddress.indexOf(';');
    body.AddressLine1 = commaIdx > -1 ? currentAddress.slice(0, commaIdx).trim() : currentAddress;
    body.AddressLine2 = commaIdx > -1 ? currentAddress.slice(commaIdx + 1).trim() : '';
  }

  const res = await fetch(PROPERTY_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_PROPERTY),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  console.log('ENFORMION_PROPERTY_STATUS:', res.status);
  if (!res.ok) return [];

  const data = await res.json();
  const results: any[] = extractRowsDefault(data);
  console.log('ENFORMION_PROPERTY_RESULTS:', results.length);

  return results.slice(0, 4).map((p: any) => {
    const addr = p.fullAddress ?? p.FullAddress
      ?? [p.addressLine1 ?? p.AddressLine1, p.addressLine2 ?? p.AddressLine2].filter(Boolean).join(', ');
    const purchaseDateRaw = p.saleDate ?? p.SaleDate ?? p.purchaseDate ?? p.PurchaseDate;
    const purchaseDate = purchaseDateRaw
      ? new Date(purchaseDateRaw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : undefined;
    const saleAmt = p.saleAmount ?? p.SaleAmount ?? p.purchasePrice ?? p.PurchasePrice;
    const avm = p.estimatedValue ?? p.EstimatedValue ?? p.avm ?? p.AVM;
    const rent = p.estimatedRent ?? p.EstimatedRent;
    const ownerName = p.ownerName ?? p.OwnerName ?? p.owner ?? p.Owner;
    const rawType = p.propertyType ?? p.PropertyType ?? p.landUse ?? p.LandUse ?? '';
    return {
      address: addr,
      ownerName,
      purchasePrice: saleAmt ? `$${Number(saleAmt).toLocaleString()}` : undefined,
      purchaseDate,
      yearsOwned: purchaseDate ? `Since ${purchaseDate}` : undefined,
      currentValue: avm ? `$${Number(avm).toLocaleString()}` : undefined,
      estimatedRent: rent ? `$${Number(rent).toLocaleString()}/mo` : undefined,
      propertyType: rawType || undefined,
      beds: p.bedrooms ?? p.Bedrooms ?? p.beds ?? undefined,
      baths: p.bathrooms ?? p.Bathrooms ?? p.baths ?? undefined,
      sqft: p.squareFeet ?? p.SquareFeet ?? p.sqft ?? undefined,
      yearBuilt: p.yearBuilt ?? p.YearBuilt ?? undefined,
    };
  }).filter((p: any) => p.address);
}

// Reverse Phone Search. galaxy-search-type is ReversePhone — the only type
// /ReversePhoneSearch accepts — and the body is { Phone, Page, ResultsPerPage },
// per the published spec.
//
// The spec's example passes a dashed number ("123-456-7890") and Enformion
// echoes numbers back formatted, so if bare digits return nothing the
// documented format is tried before giving up. The log line names which format
// produced rows.
async function reversePhone(
  username: string, password: string, digits: string,
): Promise<any[]> {
  const formats = [digits];
  if (digits.length === 10) {
    formats.push(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
    formats.push(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
  }

  for (const phone of formats) {
    const rows = await proSearch(
      username, password, PHONE_URL, SEARCH_TYPE_PHONE,
      { Phone: phone, Page: 1, ResultsPerPage: 10 },
      `REVERSEPHONE:${phone}`,
      // This endpoint returns `reversePhoneRecords`, not `results`. Without
      // this the default extractor found nothing and a populated response was
      // logged as EMPTY.
      (data) => data?.reversePhoneRecords ?? data?.ReversePhoneRecords ?? [],
    );
    if (rows.length) return rows.map(normalizeReversePhoneRow);
  }
  return [];
}

// A ReversePhoneSearch row is shaped differently from a Person Search row: the
// identity sits under `tahoePerson`, the name is a `names` array, and the
// carrier and line type describe the searched number at the top level instead
// of in a `phoneNumbers` list. Normalise once here so pickBestMatch, findPhone
// and the TahoeId drill-down downstream can all stay written against a single
// shape — and so the `r.tahoeId || r.name || r.fullName` filter in Step 1 stops
// discarding every row it is handed.
function normalizeReversePhoneRow(r: any): any {
  const person = r?.tahoePerson ?? {};
  const name = r?.names?.[0] ?? person?.name ?? {};
  const fullName = [name.firstName, name.middleName, name.lastName]
    .filter(Boolean).join(' ').trim() || undefined;

  const existing = Array.isArray(r?.phoneNumbers) ? r.phoneNumbers : [];

  return {
    ...r,
    // recordId carries the same identifier as tahoeId on this endpoint, so it
    // is a safe last resort for the drill-down.
    tahoeId: person.tahoeId ?? r?.tahoeId ?? r?.recordId,
    fullName,
    firstName: name.firstName,
    lastName: name.lastName,
    phoneNumbers: existing.length ? existing : (r?.phoneNumber ? [{
      phoneNumber: r.phoneNumber,
      phoneType: r.phoneType,
      carrier: r.carrier,
      company: r.carrier,
      isConnected: r.isConnected,
      phoneOrder: 1,
    }] : []),
  };
}

// Fetches the full person record by TahoeId. Includes are only honoured when
// the request carries a unique identifier, which a TahoeId is — a name is not,
// and asking for Includes alongside one returns 400.
async function personSearchById(
  username: string, password: string, tahoeId: string, includes: string[],
): Promise<any | null> {
  const rows = await proSearch(
    username, password, BASE_URL, SEARCH_TYPE_PERSON,
    { TahoeId: tahoeId, Includes: includes, FilterOptions: ['IncludeLowQualityAddresses'], ResultsPerPage: 1 },
    'BYID',
  );
  return rows[0] ?? null;
}

export interface CriminalFinding {
  /** Human-readable summary of the offence. Never contains SSN. */
  summary: string;
  /** True when the record comes from a sex offender registry. */
  sexOffender: boolean;
  /** True when the record was corroborated against the subject's own age/state. */
  corroborated: boolean;
}

export interface CriminalResult {
  findings: CriminalFinding[];
  /** True if any corroborated record is a sex offender registry listing. */
  onSexOffenderRegistry: boolean;
  /** True if we searched but could only match on name, with no corroboration. */
  nameOnlyMatches: boolean;
}

// Criminal Search V2 — POST /CriminalSearch/V2, body { FirstName, LastName,
// Dob?, Page, ResultsPerPage }. Unlike Person Search this responds in
// PascalCase under a CriminalRecords key.
//
// This endpoint matches on NAME, and Enformion does not return a usable DOB for
// the subject, so a raw hit means "someone with this name has a record" — not
// "this man has a record". Attributing a stranger's conviction to the person
// being searched would be both defamatory and, for a product women use to
// decide whether to meet someone, actively misleading. Every record is
// therefore corroborated against the subject's own age and known states before
// it is presented as theirs.
async function lookupCriminal(
  username: string,
  password: string,
  fullName?: string,
  subject?: { age?: number; states?: string[] },
): Promise<CriminalResult> {
  const empty: CriminalResult = { findings: [], onSexOffenderRegistry: false, nameOnlyMatches: false };
  if (!fullName) return empty;

  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return empty;

  const rows = await proSearch(
    username, password, CRIMINAL_URL, SEARCH_TYPE_CRIMINAL,
    { FirstName: parts[0], LastName: parts[parts.length - 1], Page: 1, ResultsPerPage: 10 },
    'CRIMINAL',
    (d: any) => d.CriminalRecords ?? d.criminalRecords ?? [],
  );

  const subjectStates = new Set((subject?.states ?? []).map(s => s.toUpperCase()));
  const findings: CriminalFinding[] = [];

  for (const rec of rows.slice(0, 10)) {
    const offenses: any[] = rec.Offenses ?? [];
    const cases: any[] = rec.CaseDetails ?? [];
    const attrs: any[] = rec.OffenderAttributes ?? [];
    const addrs: any[] = rec.Addresses ?? [];

    // --- Corroboration: does this record plausibly belong to our subject? ---
    let ageMatch: boolean | null = null;
    if (subject?.age) {
      for (const a of attrs) {
        const recAge = a.Age ?? (a.Dob ? new Date().getFullYear() - new Date(a.Dob).getFullYear() : null);
        if (typeof recAge === 'number' && Number.isFinite(recAge)) {
          // Allow two years' drift for partial dates and reporting lag.
          ageMatch = Math.abs(recAge - subject.age) <= 2;
          if (ageMatch) break;
        }
      }
    }

    let stateMatch: boolean | null = null;
    if (subjectStates.size) {
      const recStates = [
        ...addrs.map((a: any) => a.State),
        ...offenses.map((o: any) => o.SourceState),
        ...cases.map((c: any) => c.CourtCounty),
      ].filter(Boolean).map((s: string) => String(s).toUpperCase());
      if (recStates.length) stateMatch = recStates.some(s => subjectStates.has(s));
    }

    // Corroborated only when a check actually ran and passed, and nothing
    // positively contradicts it. Unknown is never treated as agreement.
    const checksRun = ageMatch !== null || stateMatch !== null;
    const contradicted = ageMatch === false || stateMatch === false;
    const corroborated = checksRun && !contradicted;

    const isSexOffence = String(rec.ShortCat ?? '').toUpperCase().includes('SEX')
      || cases.some((c: any) => /sex offender/i.test(String(c.MappedCategory ?? c.RawCategory ?? c.Source ?? '')));

    for (const off of offenses.length ? offenses : [null]) {
      const desc = off
        ? (Array.isArray(off.OffenseDescription) ? off.OffenseDescription.join('; ') : off.OffenseDescription)
        : null;
      const category = cases[0]?.MappedCategory ?? cases[0]?.RawCategory ?? rec.ShortCat;
      const year = yearOf(off?.ConvictionDate ?? off?.OffenseDate ?? off?.DispositionDate ?? cases[0]?.CaseDate);
      const where = off?.SourceState ?? addrs[0]?.State;
      const disposition = off?.Disposition;

      // Deliberately excludes Names[].Ssn and every identifying attribute
      // (Race, Sex, Height, ScarsMarks) — none of it belongs in this report.
      const summary = [desc || category || 'Record on file', disposition, year, where]
        .filter(Boolean).join(' · ');

      if (summary) findings.push({ summary, sexOffender: isSexOffence, corroborated });
    }
  }

  const corroboratedFindings = findings.filter(f => f.corroborated);
  console.log('ENFORMION_CRIMINAL_MATCH:', findings.length, 'records,', corroboratedFindings.length, 'corroborated');

  return {
    findings: findings.slice(0, 8),
    onSexOffenderRegistry: corroboratedFindings.some(f => f.sexOffender),
    nameOnlyMatches: findings.length > 0 && corroboratedFindings.length === 0,
  };
}

// OFAC / sanctions and prohibited-parties screening.
async function lookupOfac(
  username: string, password: string, fullName?: string,
): Promise<string[]> {
  if (!fullName) return [];
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return [];
  const rows = await proSearch(
    username, password, OFAC_URL, SEARCH_TYPE_OFAC,
    // OfacSearch does not take FirstName/LastName. Its own 400 names the
    // accepted fields: "At least one must be provided. (EntityName or
    // PersonName)". Sent as a single string; if it wants a structured value
    // the next 400 will name the sub-fields.
    { PersonName: parts.join(' '), ResultsPerPage: 3 },
    'OFAC',
  );
  return rows.slice(0, 3).map((o: any) => {
    const list = pick(o, 'listName', 'list', 'program', 'sanctionsProgram', 'source') ?? 'Sanctions list';
    const name = pick(o, 'fullName', 'name', 'entityName');
    return [list, name].filter(Boolean).join(' · ');
  }).filter(Boolean);
}

// Workplace Search. Person Search reports hasWorkplaceRecords but does not
// return the WorkPlace array unless that include is entitled, so employment
// comes from the dedicated endpoint instead.
async function lookupWorkplace(
  username: string, password: string, tahoeId?: string, fullName?: string,
): Promise<{ title?: string; company?: string } | null> {
  const body = identityBody(tahoeId, fullName, 3);
  if (!body) return null;
  const rows = await proSearch(username, password, WORKPLACE_URL, SEARCH_TYPE_WORKPLACE, body, 'WORKPLACE');
  const current = rows.find((w: any) => w.isCurrent === true || w.current === true) ?? rows[0];
  if (!current) return null;
  return {
    title: pick(current, 'title', 'jobTitle', 'position', 'occupation'),
    company: pick(current, 'company', 'companyName', 'employer', 'employerName', 'organization'),
  };
}

// Detail endpoints accept either the person's TahoeId or a name.
function identityBody(tahoeId?: string, fullName?: string, perPage = 5): Record<string, unknown> | null {
  if (tahoeId) return { TahoeId: tahoeId, ResultsPerPage: perPage };
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return null;
    return { FirstName: parts[0], LastName: parts.slice(1).join(' '), ResultsPerPage: perPage };
  }
  return null;
}

async function lookupLinkedIn(
  username: string,
  password: string,
  tahoeId: string,
): Promise<{ url?: string; headline?: string } | null> {
  const res = await fetch(LINKEDIN_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_LINKEDIN),
    body: JSON.stringify({ TahoeId: tahoeId }),
    signal: AbortSignal.timeout(10000),
  });

  console.log('ENFORMION_LINKEDIN_STATUS:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = extractRowsDefault(data);
  if (!results.length) return null;

  const r = results[0];
  const url = r.linkedInUrl ?? r.LinkedInUrl ?? r.url ?? r.URL ?? r.profileUrl ?? r.ProfileUrl;
  const headline = r.headline ?? r.Headline ?? r.title ?? r.Title ?? r.jobTitle ?? r.JobTitle;

  console.log('ENFORMION_LINKEDIN_FOUND:', !!url);
  return { url, headline };
}

async function lookupCensus(
  username: string,
  password: string,
  address: string,
): Promise<{ neighborhood?: string } | null> {
  const commaIdx = address.indexOf(';');
  const body: Record<string, unknown> = {
    AddressLine1: commaIdx > -1 ? address.slice(0, commaIdx).trim() : address,
    AddressLine2: commaIdx > -1 ? address.slice(commaIdx + 1).trim() : '',
    ResultsPerPage: 1,
  };

  const res = await fetch(CENSUS_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_CENSUS),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  console.log('ENFORMION_CENSUS_STATUS:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = extractRowsDefault(data);
  if (!results.length) return null;

  const r = results[0];
  const neighborhood = r.neighborhood ?? r.Neighborhood ?? r.tract ?? r.Tract
    ?? r.censusBlock ?? r.CensusBlock ?? r.area ?? r.Area;

  return { neighborhood };
}

async function lookupDivorce(
  username: string,
  password: string,
  tahoeId?: string,
  fullName?: string,
): Promise<string | null> {
  if (!tahoeId && !fullName) return null;

  const body: Record<string, unknown> = { ResultsPerPage: 3 };
  if (tahoeId) {
    body.TahoeId = tahoeId;
  } else if (fullName) {
    const parts = fullName.trim().split(' ');
    body.FirstName = parts[0];
    body.LastName = parts.slice(1).join(' ');
  }

  const res = await fetch(DIVORCE_URL, {
    method: 'POST',
    headers: makeHeaders(username, password, SEARCH_TYPE_DIVORCE),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  console.log('ENFORMION_DIVORCE_STATUS:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = extractRowsDefault(data);
  console.log('ENFORMION_DIVORCE_RESULTS:', results.length);
  if (!results.length) return null;

  const r = results[0];
  const year = r.divorceDate ?? r.DivorceDate ?? r.filingDate ?? r.FilingDate;
  const county = r.county ?? r.County ?? r.jurisdiction ?? r.Jurisdiction;
  const parts = [year ? new Date(year).getFullYear() : null, county].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Divorce record on file';
}

function emptyPhone(): EnformionPhone {
  return { lineType: 'mobile', origin: '—', active: true };
}
