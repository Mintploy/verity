import type { SupabaseClient } from '@supabase/supabase-js';
import { ickText, type DateEntry, type IckEntry } from './journal';
import { getUserSupabase } from './supabase';
import { getStarSign, getCompatibility, StarSign } from './starsigns';
import {
  decryptFields, encryptFields, encryptValue, generateDataKey, unwrapDataKey, wrapDataKey,
} from './crypto';
import { hmacHisFile } from './lookups';
import { cleanFlagList } from './flags';

/** Why the file was opened. Decides which questionnaire the entry shows. */
export type FileType = 'dating' | 'safety';

export const FILE_TYPES: FileType[] = ['dating', 'safety'];

export interface HisFile {
  id?: string;
  user_id?: string;
  file_type?: FileType;
  nickname: string;
  full_name?: string;
  phone?: string;
  /** Keyed hashes for dedupe. Server-computed, never from the body. */
  phone_hmac?: string | null;
  name_hmac?: string | null;
  nickname_hmac?: string | null;
  date_of_birth?: string;
  star_sign?: string;
  safety_score?: string;
  report_id?: string;
  report_data?: Record<string, unknown>;
  status?: string;
  where_we_met?: string;
  meetup_location?: string;
  met_on_app?: string;
  met_date?: string;
  first_date_location?: string;
  first_date_date?: string;
  first_date_paid?: string;
  gifts?: string[];
  icks?: Array<string | IckEntry>;
  /** Every date, with how she felt. Date 1 is mirrored in first_date_*. */
  dates?: DateEntry[];
  /** Plaintext count of `dates`, maintained on save. See rls_owner_policies.sql. */
  date_count?: number;
  accurate_salary?: string;
  generosity_rating?: string;
  his_finsta?: string;
  notes?: string;
  compatibility_score?: number;
  compatibility_summary?: string;
  researched_at?: string;
}

export interface UserProfile {
  user_id: string;
  email: string;
  date_of_birth?: string;
  star_sign?: string;
  /** What she watches for on a date. Seeds the one-tap chips. See lib/flags.ts. */
  green_flags?: string[];
  red_flags?: string[];
}

export interface VerityWrapped {
  id?: string;
  user_id?: string;
  year: number;
  total_searches?: number;
  total_saved?: number;
  green_count?: number;
  yellow_count?: number;
  red_count?: number;
  most_active_month?: string;
  most_common_app?: string;
  most_common_ick?: string;
  average_generosity?: string;
  star_sign_breakdown?: Record<string, number>;
  status_breakdown?: Record<string, number>;
  headline?: string;
  share_token?: string;
  is_public?: boolean;
}

/**
 * Journal and report fields held as ciphertext at rest. The whole `dates`
 * array is one value, which covers likedMore, likedLess, duringNote and both
 * feelings. report_data is the stored report about him.
 */
export const ENCRYPTED_FIELDS = ['notes', 'dates', 'icks', 'gifts', 'report_data'] as const;

/**
 * His identity. Encrypted on write only once HISFILE_IDENTITY_ENCRYPTION=on,
 * which is set after scripts/encrypt-identity.ts has run; read either way.
 * Dedupe uses the HMAC columns, never these.
 */
export const IDENTITY_FIELDS = ['full_name', 'nickname', 'phone'] as const;

const ALL_ENCRYPTED = [...ENCRYPTED_FIELDS, ...IDENTITY_FIELDS] as const;

/** The subset Wrapped reads. It never opens a report. */
const WRAPPED_FIELDS = ['icks'] as const;

/** Columns the API must never hand to the browser. */
const PROFILE_PRIVATE_COLUMNS = ['data_key_enc'] as const;

export function identityEncryptionOn(): boolean {
  return process.env.HISFILE_IDENTITY_ENCRYPTION === 'on';
}

/**
 * Everything a member may set on her own file, from the request body. Every
 * other column is either derived here (star sign, compatibility, HMACs,
 * date_count, researched_at) or comes from a server code path (report_id,
 * report_data and safety_score, via search_reports).
 */
export const MEMBER_EDITABLE_FIELDS = [
  'file_type', 'nickname', 'full_name', 'phone', 'date_of_birth', 'status',
  'where_we_met', 'meetup_location', 'met_on_app', 'met_date',
  'first_date_location', 'first_date_date', 'first_date_paid',
  'gifts', 'icks', 'dates', 'accurate_salary', 'generosity_rating', 'his_finsta', 'notes',
] as const satisfies readonly (keyof HisFile)[];

// ---------------------------------------------------------------------------
// Data key
// ---------------------------------------------------------------------------

/**
 * Her data key, unwrapped, for this request only.
 *
 * Created on first use. Two first writes racing would each mint a key and the
 * loser's ciphertext would be unreadable, so the write is conditional on the
 * column still being null and the loser re-reads the winner's key.
 *
 * Works with a member-scoped client or the service client (the cron job
 * decrypts reminders with it).
 */
export async function getDataKey(sb: SupabaseClient, userId: string, opts: { create: boolean }): Promise<Buffer | null> {
  const { data, error } = await sb
    .from('user_profiles')
    .select('data_key_enc')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data?.data_key_enc) return unwrapDataKey(data.data_key_enc, userId);
  if (!opts.create) return null;

  const fresh = generateDataKey();
  const wrapped = wrapDataKey(fresh, userId);

  if (data) {
    const { data: won, error: upErr } = await sb
      .from('user_profiles')
      .update({ data_key_enc: wrapped })
      .eq('user_id', userId)
      .is('data_key_enc', null)
      .select('data_key_enc');
    if (upErr) throw upErr;
    if (won?.length) return fresh;
  } else {
    // No profile row yet (a test account, or a member the webhook missed).
    const { error: insErr } = await sb
      .from('user_profiles')
      .insert({ user_id: userId, email: userId, data_key_enc: wrapped });
    if (!insErr) return fresh;
    if (insErr.code !== '23505') throw insErr; // anything but "already exists"
  }

  // Lost the race: read the key that won.
  const { data: again, error: reErr } = await sb
    .from('user_profiles')
    .select('data_key_enc')
    .eq('user_id', userId)
    .single();
  if (reErr) throw reErr;
  if (!again?.data_key_enc) throw new Error('Data key missing after conditional write');
  return unwrapDataKey(again.data_key_enc, userId);
}

function decryptFile(key: Buffer | null, row: HisFile, fields: readonly string[] = ALL_ENCRYPTED): HisFile {
  return key ? decryptFields(key, row, fields) : row;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const sb = await getUserSupabase(userId);
  const { data, error } = await sb.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  for (const c of PROFILE_PRIVATE_COLUMNS) delete data[c];
  return data;
}

/**
 * Only the fields a member may set about herself. The billing columns are
 * refused by column grants at the database as well; this keeps the request
 * body from ever naming them.
 */
const PROFILE_EDITABLE: (keyof UserProfile)[] = ['date_of_birth', 'green_flags', 'red_flags'];

export async function upsertUserProfile(userId: string, email: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const sb = await getUserSupabase(userId);
  const allowed: Partial<UserProfile> = {};
  for (const k of PROFILE_EDITABLE) {
    if (updates[k] === undefined) continue;
    (allowed as Record<string, unknown>)[k] =
      k === 'green_flags' || k === 'red_flags' ? cleanFlagList(updates[k]) : updates[k];
  }
  const starSign = allowed.date_of_birth ? getStarSign(allowed.date_of_birth) : undefined;
  const row = { user_id: userId, email, ...allowed, ...(starSign ? { star_sign: starSign } : {}) };
  const { data, error } = await sb.from('user_profiles').upsert(row, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  if (data) for (const c of PROFILE_PRIVATE_COLUMNS) delete data[c];
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Search reports: the server-side copy a His File save draws from
// ---------------------------------------------------------------------------

/**
 * Stores the report she just ran, encrypted under her data key, and clears
 * her expired ones. Called by the search route. A failure here is logged by
 * the caller and does not fail the search; it only means a later "Save to
 * His File" will not find the report.
 */
export async function saveSearchReport(
  userId: string,
  report: { searchId: string; score?: string } & Record<string, unknown>,
): Promise<void> {
  const sb = await getUserSupabase(userId);
  const key = await getDataKey(sb, userId, { create: true });
  if (!key) throw new Error('Could not obtain a data key');
  const { error } = await sb.from('search_reports').upsert({
    user_id: userId,
    report_id: report.searchId,
    report_enc: encryptValue(key, report),
    safety_score: report.score ?? null,
  }, { onConflict: 'user_id,report_id' });
  if (error) throw error;
  await sb.from('search_reports').delete().eq('user_id', userId).lt('expires_at', new Date().toISOString());
}

/** The stored report's ciphertext and score, for attaching to a His File. */
async function findSearchReport(sb: SupabaseClient, userId: string, reportId: string): Promise<{ report_enc: string; safety_score: string | null } | null> {
  const { data, error } = await sb
    .from('search_reports')
    .select('report_enc, safety_score')
    .eq('user_id', userId)
    .eq('report_id', reportId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// ---------------------------------------------------------------------------
// His Files
// ---------------------------------------------------------------------------

export async function getHisFiles(userId: string): Promise<HisFile[]> {
  const sb = await getUserSupabase(userId);
  const { data, error } = await sb.from('his_files').select('*').eq('user_id', userId).order('researched_at', { ascending: false });
  if (error) throw error;
  if (!data?.length) return [];
  const key = await getDataKey(sb, userId, { create: false });
  return data.map((row: HisFile) => decryptFile(key, row));
}

export async function getHisFile(userId: string, id: string): Promise<HisFile | null> {
  const sb = await getUserSupabase(userId);
  const { data } = await sb.from('his_files').select('*').eq('user_id', userId).eq('id', id).single();
  if (!data) return null;
  const key = await getDataKey(sb, userId, { create: false });
  return decryptFile(key, data);
}

/**
 * Ten digits, or null. What the phone HMAC is taken over. Keep in step with
 * the audit log's normalizePhoneDigits: the two must agree on what "the same
 * number" means.
 */
export function normalizePhone(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function normalizeName(name?: string | null): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The three dedupe hashes for a file, from its plaintext identity fields. */
export function identityHmacs(file: { phone?: string | null; full_name?: string | null; nickname?: string | null }): {
  phone_hmac: string | null; name_hmac: string | null; nickname_hmac: string | null;
} {
  const digits = normalizePhone(file.phone);
  const name = normalizeName(file.full_name);
  const nick = normalizeName(file.nickname);
  return {
    phone_hmac: digits ? hmacHisFile('phone', digits) : null,
    name_hmac: name ? hmacHisFile('name', name) : null,
    nickname_hmac: nick ? hmacHisFile('name', nick) : null,
  };
}

/**
 * The same man saved twice is one file, not two. Phone is the reliable key,
 * it is what the search was run on. Entries created by hand may have no phone,
 * so those fall back to an exact name match, which is deliberately narrow:
 * merging two different people is worse than showing one entry twice.
 *
 * Matching is entirely on the HMAC columns, which every row carries and
 * which saveHisFile maintains. The identity fields themselves are ciphertext
 * and are never compared. The row it returns is raw; saveHisFile decrypts it
 * before comparing fields.
 */
async function findDuplicateRaw(sb: SupabaseClient, userId: string, file: HisFile): Promise<HisFile | null> {
  const h = identityHmacs(file);

  if (h.phone_hmac) {
    const { data, error } = await sb.from('his_files')
      .select('*').eq('user_id', userId).eq('phone_hmac', h.phone_hmac)
      .order('researched_at', { ascending: true }).limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  const hashes = [h.name_hmac, h.nickname_hmac].filter((x): x is string => !!x);
  if (hashes.length === 0) return null;
  const list = `(${hashes.join(',')})`;
  const { data, error } = await sb.from('his_files')
    .select('*').eq('user_id', userId).is('phone_hmac', null)
    .or(`name_hmac.in.${list},nickname_hmac.in.${list}`)
    .order('researched_at', { ascending: true }).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function findDuplicateHisFile(userId: string, file: HisFile): Promise<HisFile | null> {
  const sb = await getUserSupabase(userId);
  const raw = await findDuplicateRaw(sb, userId, file);
  if (!raw) return null;
  return decryptFile(await getDataKey(sb, userId, { create: false }), raw);
}

/** Fields a re-save may fill in but must never overwrite once the user has set them. */
const USER_OWNED_FIELDS: (keyof HisFile)[] = ['dates',
  'nickname', 'full_name', 'phone', 'date_of_birth', 'status', 'his_finsta', 'notes',
  'where_we_met', 'meetup_location', 'met_on_app', 'met_date',
  'first_date_location', 'first_date_date', 'first_date_paid',
  'accurate_salary', 'generosity_rating',
];

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export interface SaveResult {
  file: HisFile | null;
  /** True when the save landed on an entry that already existed. */
  merged: boolean;
}

/**
 * The saved report behind a report id: the search copy if it is still there,
 * else the one attached to a His File entry.
 *
 * A report used to live only in the tab that generated it, in sessionStorage,
 * so "View report" worked until the tab closed and then said "Report not
 * found" forever.
 */
export async function getReportByReportId(
  userId: string,
  reportId: string,
): Promise<Record<string, unknown> | null> {
  const sb = await getUserSupabase(userId);
  const key = await getDataKey(sb, userId, { create: false });

  const fresh = await findSearchReport(sb, userId, reportId);
  if (fresh && key) {
    return decryptFields(key, { report_data: fresh.report_enc as unknown }, ['report_data']).report_data as Record<string, unknown>;
  }

  const { data } = await sb
    .from('his_files')
    .select('report_data')
    .eq('user_id', userId)
    .eq('report_id', reportId)
    .maybeSingle();
  if (!data?.report_data) return null;
  const row = decryptFile(key, data as HisFile, ['report_data']);
  return (row.report_data as Record<string, unknown> | undefined) ?? null;
}

/** The body reduced to what a member may set. */
function memberFields(body: Partial<HisFile>): Partial<HisFile> {
  const out: Record<string, unknown> = {};
  for (const f of MEMBER_EDITABLE_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  return out as Partial<HisFile>;
}

/**
 * What the body says about who he is and what she has logged. Everything
 * else is derived here or looked up from search_reports by report_id.
 */
export interface SaveHisFileInput extends Partial<HisFile> {
  /** The report to attach. Looked up server-side; the body's report_data is ignored. */
  report_id?: string;
}

export async function saveHisFile(userId: string, body: SaveHisFileInput): Promise<SaveResult> {
  const sb = await getUserSupabase(userId);
  const key = await getDataKey(sb, userId, { create: true });
  if (!key) throw new Error('Could not obtain a data key');

  const file = memberFields(body);
  const id = typeof body.id === 'string' ? body.id : undefined;

  // The report, from the server's own copy. The browser names it; it does not
  // supply it. Same data key, so the ciphertext is attached as-is.
  let attached: { report_id: string; report_data: string; safety_score: string | null } | null = null;
  if (typeof body.report_id === 'string' && body.report_id) {
    const found = await findSearchReport(sb, userId, body.report_id);
    if (found) attached = { report_id: body.report_id, report_data: found.report_enc, safety_score: found.safety_score };
  }

  const starSign = file.date_of_birth ? getStarSign(file.date_of_birth) : undefined;

  let compatScore: number | undefined;
  let compatSummary: string | undefined;
  if (starSign) {
    const profile = await getUserProfile(userId);
    if (profile?.star_sign) {
      const compat = getCompatibility(starSign, profile.star_sign as StarSign);
      compatScore = compat.score;
      compatSummary = compat.summary;
    }
  }

  const derived = {
    ...(starSign ? { star_sign: starSign } : {}),
    ...(compatScore !== undefined ? { compatibility_score: compatScore, compatibility_summary: compatSummary } : {}),
    ...(Array.isArray(file.dates) ? { date_count: file.dates.length } : {}),
  };

  // Seal journal fields always; identity fields only once the flag is on.
  const sealFields = identityEncryptionOn() ? ALL_ENCRYPTED : ENCRYPTED_FIELDS;
  const seal = (r: Record<string, unknown>) => encryptFields(key, r, sealFields);

  // HMACs are recomputed whenever an identity field is part of the write.
  const identityTouched = IDENTITY_FIELDS.some((f) => file[f] !== undefined);

  if (id) {
    // An edit to an existing entry. Only her fields, plus what derives from them.
    const patch: Record<string, unknown> = { ...file, ...derived };
    if (attached) Object.assign(patch, attached, { researched_at: new Date().toISOString() });
    if (identityTouched) {
      const { data: current } = await sb.from('his_files').select('full_name, nickname, phone').eq('id', id).eq('user_id', userId).maybeSingle();
      const merged = { ...(current ? decryptFile(key, current as HisFile, IDENTITY_FIELDS) : {}), ...file };
      Object.assign(patch, identityHmacs(merged as HisFile));
    }
    const { data, error } = await sb.from('his_files')
      .update(seal(patch)).eq('id', id).eq('user_id', userId).select().single();
    if (error) throw error;
    return { file: data ? decryptFile(key, data) : null, merged: false };
  }

  const existingRaw = await findDuplicateRaw(sb, userId, file as HisFile);

  if (existingRaw) {
    const existing = decryptFile(key, existingRaw);
    // Saving the same man again refreshes the report he is attached to and
    // fills the blanks. It does not undo anything the user has typed since.
    const patch: Record<string, unknown> = {
      researched_at: new Date().toISOString(),
      ...(attached ?? {}),
      ...derived,
      // An explicit choice in the save dialog wins, it was made seconds ago.
      ...(file.file_type ? { file_type: file.file_type } : {}),
    };
    for (const field of USER_OWNED_FIELDS) {
      if (isEmpty(existing[field]) && !isEmpty(file[field])) patch[field] = file[field];
    }
    if (Array.isArray(patch.dates)) patch.date_count = (patch.dates as unknown[]).length;
    // The row may predate the HMAC columns; fill them from what it holds.
    Object.assign(patch, identityHmacs({ ...existing, ...patchIdentity(patch) }));

    const { data, error } = await sb.from('his_files')
      .update(seal(patch)).eq('id', existing.id!).eq('user_id', userId).select().single();
    if (error) throw error;
    return { file: data ? decryptFile(key, data) : null, merged: true };
  }

  const row: Record<string, unknown> = {
    ...file,
    ...derived,
    ...(attached ?? {}),
    ...identityHmacs(file as HisFile),
    user_id: userId,
    researched_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from('his_files').insert(seal(row)).select().single();
  if (error) throw error;
  return { file: data ? decryptFile(key, data) : null, merged: false };
}

function patchIdentity(patch: Record<string, unknown>): Partial<HisFile> {
  const out: Partial<HisFile> = {};
  for (const f of IDENTITY_FIELDS) if (patch[f] !== undefined) (out as Record<string, unknown>)[f] = patch[f];
  return out;
}

export async function deleteHisFile(userId: string, id: string): Promise<boolean> {
  const sb = await getUserSupabase(userId);
  const { error } = await sb.from('his_files').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

export async function backfillCompatibility(userId: string, userSign: StarSign): Promise<void> {
  const sb = await getUserSupabase(userId);
  const { data: files } = await sb.from('his_files').select('id, star_sign').eq('user_id', userId);
  if (!files?.length) return;
  for (const file of files) {
    if (!file.star_sign) continue;
    const compat = getCompatibility(file.star_sign as StarSign, userSign);
    await sb.from('his_files')
      .update({ compatibility_score: compat.score, compatibility_summary: compat.summary })
      .eq('id', file.id)
      .eq('user_id', userId);
  }
}

// ---------------------------------------------------------------------------
// Wrapped
// ---------------------------------------------------------------------------

export async function generateWrapped(userId: string, year: number): Promise<VerityWrapped | null> {
  const sb = await getUserSupabase(userId);

  const startOf = `${year}-01-01T00:00:00.000Z`;
  const endOf = `${year + 1}-01-01T00:00:00.000Z`;

  const { data: rows } = await sb
    .from('his_files')
    .select('*')
    .eq('user_id', userId)
    .gte('researched_at', startOf)
    .lt('researched_at', endOf);

  if (!rows || rows.length === 0) return null;

  // Icks are ciphertext at rest; the aggregate needs the words.
  const key = await getDataKey(sb, userId, { create: false });
  const files: HisFile[] = rows.map((r: HisFile) => decryptFile(key, r, WRAPPED_FIELDS));

  const green = files.filter((f) => f.safety_score === 'green').length;
  const yellow = files.filter((f) => f.safety_score === 'yellow').length;
  const red = files.filter((f) => f.safety_score === 'red').length;

  const monthCounts: Record<string, number> = {};
  files.forEach((f) => {
    if (f.researched_at) {
      const m = new Date(f.researched_at).toLocaleString('en-US', { month: 'long' });
      monthCounts[m] = (monthCounts[m] ?? 0) + 1;
    }
  });
  const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Dating-only metrics. A marketplace safety check has no app, no icks and no
  // one who picked up the bill, so counting those files would drag every
  // average toward nothing.
  const datingFiles = files.filter((f) => (f.file_type ?? 'dating') === 'dating');

  const appCounts: Record<string, number> = {};
  datingFiles.forEach((f) => {
    if (f.met_on_app) appCounts[f.met_on_app] = (appCounts[f.met_on_app] ?? 0) + 1;
  });
  const mostCommonApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const ickCounts: Record<string, number> = {};
  datingFiles.forEach((f) => {
    (f.icks ?? []).forEach((ick) => {
      const text = ickText(ick);
      ickCounts[text] = (ickCounts[text] ?? 0) + 1;
    });
  });
  const mostCommonIck = Object.entries(ickCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const genOrder = ['cheap', 'average', 'generous', 'spoils me'];
  const genFiles = datingFiles.filter((f) => f.generosity_rating);
  const avgGenScore = genFiles.length
    ? Math.round(genFiles.reduce((s: number, f) => s + (genOrder.indexOf(f.generosity_rating!) + 1), 0) / genFiles.length)
    : 0;
  const avgGenerosity = avgGenScore > 0 ? genOrder[avgGenScore - 1] : null;

  const signCounts: Record<string, number> = {};
  files.forEach((f) => {
    if (f.star_sign) signCounts[f.star_sign] = (signCounts[f.star_sign] ?? 0) + 1;
  });

  const statusCounts: Record<string, number> = {};
  files.forEach((f) => {
    if (f.status) statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;
  });

  const topDomain = red > green && red > yellow ? 'caution' : green > yellow ? 'well' : 'mixed results';
  const headline = `You researched ${files.length} men in ${year} and came out with ${topDomain}.`;

  // The stored row carries only the counts. most_common_ick is journal content
  // and is returned to her but never persisted in plaintext; share_token is a
  // database default. The row's own (user_id, year) key is the conflict target.
  const stored: Omit<VerityWrapped, 'most_common_ick' | 'share_token'> = {
    user_id: userId,
    year,
    total_searches: files.length,
    total_saved: files.length,
    green_count: green,
    yellow_count: yellow,
    red_count: red,
    most_active_month: mostActiveMonth ?? undefined,
    most_common_app: mostCommonApp ?? undefined,
    average_generosity: avgGenerosity ?? undefined,
    star_sign_breakdown: signCounts,
    status_breakdown: statusCounts,
    headline,
    is_public: false,
  };

  const { data } = await sb.from('verity_wrapped').upsert(stored, { onConflict: 'user_id,year' }).select().single();
  const out: VerityWrapped = { ...(data ?? stored), most_common_ick: mostCommonIck ?? undefined };
  delete out.share_token;
  return out;
}
