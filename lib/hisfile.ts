import { getServiceSupabase } from './supabase';
import { getStarSign, getCompatibility, StarSign } from './starsigns';

export interface HisFile {
  id?: string;
  user_id?: string;
  nickname: string;
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  star_sign?: string;
  safety_score?: string;
  report_id?: string;
  report_data?: Record<string, unknown>;
  status?: string;
  where_we_met?: string;
  met_on_app?: string;
  met_date?: string;
  first_date_location?: string;
  first_date_date?: string;
  first_date_paid?: string;
  gifts?: string[];
  icks?: string[];
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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const sb = getServiceSupabase();
  const { data } = await sb.from('user_profiles').select('*').eq('user_id', userId).single();
  return data ?? null;
}

export async function upsertUserProfile(userId: string, email: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const sb = getServiceSupabase();
  const starSign = updates.date_of_birth ? getStarSign(updates.date_of_birth) : undefined;
  const row = { user_id: userId, email, ...updates, ...(starSign ? { star_sign: starSign } : {}) };
  const { data } = await sb.from('user_profiles').upsert(row, { onConflict: 'user_id' }).select().single();
  return data ?? null;
}

export async function getHisFiles(userId: string): Promise<HisFile[]> {
  const sb = getServiceSupabase();
  const { data } = await sb.from('his_files').select('*').eq('user_id', userId).order('researched_at', { ascending: false });
  return data ?? [];
}

export async function getHisFile(userId: string, id: string): Promise<HisFile | null> {
  const sb = getServiceSupabase();
  const { data } = await sb.from('his_files').select('*').eq('user_id', userId).eq('id', id).single();
  return data ?? null;
}

export async function saveHisFile(userId: string, file: HisFile): Promise<HisFile | null> {
  const sb = getServiceSupabase();

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

  const row: Record<string, unknown> = {
    ...file,
    user_id: userId,
    ...(starSign ? { star_sign: starSign } : {}),
    ...(compatScore !== undefined ? { compatibility_score: compatScore, compatibility_summary: compatSummary } : {}),
    researched_at: file.researched_at ?? new Date().toISOString(),
  };

  if (file.id) {
    const { data } = await sb.from('his_files').update(row).eq('id', file.id).eq('user_id', userId).select().single();
    return data ?? null;
  } else {
    delete row.id;
    const { data } = await sb.from('his_files').insert(row).select().single();
    return data ?? null;
  }
}

export async function deleteHisFile(userId: string, id: string): Promise<boolean> {
  const sb = getServiceSupabase();
  const { error } = await sb.from('his_files').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

export async function backfillCompatibility(userId: string, userSign: StarSign): Promise<void> {
  const sb = getServiceSupabase();
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

export async function generateWrapped(userId: string, year: number): Promise<VerityWrapped | null> {
  const sb = getServiceSupabase();

  const startOf = `${year}-01-01T00:00:00.000Z`;
  const endOf = `${year + 1}-01-01T00:00:00.000Z`;

  const { data: files } = await sb
    .from('his_files')
    .select('*')
    .eq('user_id', userId)
    .gte('researched_at', startOf)
    .lt('researched_at', endOf);

  if (!files || files.length === 0) return null;

  const green = files.filter((f: HisFile) => f.safety_score === 'green').length;
  const yellow = files.filter((f: HisFile) => f.safety_score === 'yellow').length;
  const red = files.filter((f: HisFile) => f.safety_score === 'red').length;

  const monthCounts: Record<string, number> = {};
  files.forEach((f: HisFile) => {
    if (f.researched_at) {
      const m = new Date(f.researched_at).toLocaleString('en-US', { month: 'long' });
      monthCounts[m] = (monthCounts[m] ?? 0) + 1;
    }
  });
  const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const appCounts: Record<string, number> = {};
  files.forEach((f: HisFile) => {
    if (f.met_on_app) appCounts[f.met_on_app] = (appCounts[f.met_on_app] ?? 0) + 1;
  });
  const mostCommonApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const ickCounts: Record<string, number> = {};
  files.forEach((f: HisFile) => {
    (f.icks ?? []).forEach((ick: string) => {
      ickCounts[ick] = (ickCounts[ick] ?? 0) + 1;
    });
  });
  const mostCommonIck = Object.entries(ickCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const genOrder = ['cheap', 'average', 'generous', 'spoils me'];
  const genFiles = files.filter((f: HisFile) => f.generosity_rating);
  const avgGenScore = genFiles.length
    ? Math.round(genFiles.reduce((s: number, f: HisFile) => s + (genOrder.indexOf(f.generosity_rating!) + 1), 0) / genFiles.length)
    : 0;
  const avgGenerosity = avgGenScore > 0 ? genOrder[avgGenScore - 1] : null;

  const signCounts: Record<string, number> = {};
  files.forEach((f: HisFile) => {
    if (f.star_sign) signCounts[f.star_sign] = (signCounts[f.star_sign] ?? 0) + 1;
  });

  const statusCounts: Record<string, number> = {};
  files.forEach((f: HisFile) => {
    if (f.status) statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;
  });

  const topDomain = red > green && red > yellow ? 'caution' : green > yellow ? 'well' : 'mixed results';
  const headline = `You researched ${files.length} men in ${year} and came out with ${topDomain}.`;

  const shareToken = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const wrapped: VerityWrapped = {
    user_id: userId,
    year,
    total_searches: files.length,
    total_saved: files.length,
    green_count: green,
    yellow_count: yellow,
    red_count: red,
    most_active_month: mostActiveMonth ?? undefined,
    most_common_app: mostCommonApp ?? undefined,
    most_common_ick: mostCommonIck ?? undefined,
    average_generosity: avgGenerosity ?? undefined,
    star_sign_breakdown: signCounts,
    status_breakdown: statusCounts,
    headline,
    share_token: shareToken,
    is_public: false,
  };

  const { data } = await sb.from('verity_wrapped').upsert(wrapped, { onConflict: 'user_id,year' }).select().single();
  return data ?? wrapped;
}
