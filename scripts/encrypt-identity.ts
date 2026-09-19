/**
 * The identity migration for his_files: HMAC dedupe keys, then encryption of
 * full_name, nickname and phone. Run only after the journal migration
 * (encrypt-journal.ts) has been verified.
 *
 *   npm run identity:encrypt -- --dry-run   [--user you@example.com]
 *   npm run identity:encrypt -- --backfill  [--user you@example.com]
 *   npm run identity:encrypt -- --encrypt   [--user you@example.com]
 *   npm run identity:encrypt -- --rollback  [--user you@example.com]
 *
 * Phases, in order, each safe to repeat:
 *
 *   --backfill  Computes phone_hmac, name_hmac and nickname_hmac from the
 *               plaintext fields. Touches nothing else. Run it, deploy the
 *               code that reads the HMACs, then run it once more to catch
 *               rows the old code wrote in between.
 *   --encrypt   Backfills again, then encrypts the three identity fields
 *               under her data key. After this, set
 *               HISFILE_IDENTITY_ENCRYPTION=on in Vercel and redeploy so new
 *               writes are sealed too, then apply
 *               supabase/his_files_drop_phone_normalized.sql (applied 2026-09-19).
 *   --rollback  Decrypts the three identity fields. Leaves the HMACs, which
 *               are harmless. Do this before restoring phone_normalized.
 *
 * A snapshot table is taken before --backfill, --encrypt and --rollback.
 * The master key is checked against production before anything is touched.
 */
import { createClient } from '@supabase/supabase-js';
import { decryptFields, encryptFields, isCiphertext, unwrapDataKey } from '../lib/crypto';
import { IDENTITY_FIELDS, identityHmacs } from '../lib/hisfile';
import { assertMasterKeyMatchesProduction } from './lib/keycheck';

type Mode = 'dry-run' | 'backfill' | 'encrypt' | 'rollback';

function parseArgs(): { mode: Mode; user?: string } {
  const args = process.argv.slice(2);
  const mode = (['--dry-run', '--backfill', '--encrypt', '--rollback'] as const).find((m) => args.includes(m));
  if (!mode) {
    console.error('Usage: encrypt-identity.ts --dry-run | --backfill | --encrypt | --rollback [--user email]');
    process.exit(2);
  }
  const ui = args.indexOf('--user');
  const user = ui >= 0 ? args[ui + 1]?.trim().toLowerCase() : undefined;
  return { mode: mode.slice(2) as Mode, user };
}

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) { console.error(`${name} is not set`); process.exit(2); }
  return v;
}

interface Row {
  id: string;
  user_id: string;
  full_name?: string | null;
  nickname?: string | null;
  phone?: string | null;
  phone_hmac?: string | null;
  name_hmac?: string | null;
  nickname_hmac?: string | null;
}

async function main() {
  const { mode, user } = parseArgs();
  required('LOOKUP_HASH_SECRET');
  const sb = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  required('VERITY_MASTER_KEY');
  await assertMasterKeyMatchesProduction(sb);

  if (mode !== 'dry-run') {
    const { data: snap, error: snapErr } = await sb.rpc('his_files_snapshot');
    if (snapErr) throw new Error(`snapshot failed, nothing changed: ${snapErr.message}`);
    console.log(`restore point: public.${snap}  (drop it after verifying)`);
  }

  const byUser = new Map<string, Row[]>();
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    let q = sb.from('his_files')
      .select('id, user_id, full_name, nickname, phone, phone_hmac, name_hmac, nickname_hmac')
      .order('id').range(from, from + PAGE - 1);
    if (user) q = q.eq('user_id', user);
    const { data, error } = await q;
    if (error) throw error;
    for (const row of (data ?? []) as Row[]) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row);
      byUser.set(row.user_id, list);
    }
    if (!data || data.length < PAGE) break;
  }

  let changed = 0, skipped = 0, noKey = 0;

  for (const [userId, rows] of byUser) {
    const { data: prof, error: pErr } = await sb
      .from('user_profiles').select('data_key_enc').eq('user_id', userId).maybeSingle();
    if (pErr) throw pErr;
    const key = prof?.data_key_enc ? unwrapDataKey(prof.data_key_enc, userId) : null;

    if (!key && (mode === 'encrypt' || mode === 'rollback')) {
      // Journal migration creates keys; a member without one has not had it.
      console.error(`${userId}: no data key. Run encrypt-journal.ts for this member first.`);
      noKey += rows.length;
      continue;
    }

    for (const row of rows) {
      // Plaintext identity, whichever form the row is in.
      const plain = key ? decryptFields(key, row, IDENTITY_FIELDS) : row;
      const patch: Record<string, unknown> = {};

      if (mode === 'backfill' || mode === 'encrypt' || mode === 'dry-run') {
        const h = identityHmacs(plain);
        for (const [k, v] of Object.entries(h)) if ((row as unknown as Record<string, unknown>)[k] !== v) patch[k] = v;
      }

      if (mode === 'encrypt') {
        const sealed = encryptFields(key!, { full_name: row.full_name, nickname: row.nickname, phone: row.phone }, IDENTITY_FIELDS);
        for (const f of IDENTITY_FIELDS) if (sealed[f] !== row[f]) patch[f] = sealed[f];
      }

      if (mode === 'rollback') {
        for (const f of IDENTITY_FIELDS) if (isCiphertext(row[f])) patch[f] = plain[f];
      }

      if (mode === 'dry-run') {
        const wouldSeal = IDENTITY_FIELDS.filter((f) => row[f] != null && !isCiphertext(row[f]));
        if (Object.keys(patch).length || wouldSeal.length) {
          console.log(`[dry-run] ${userId} ${row.id}: hmac ${Object.keys(patch).join(',') || 'ok'}; would encrypt ${wouldSeal.join(',') || 'nothing'}`);
          changed += 1;
        } else skipped += 1;
        continue;
      }

      if (Object.keys(patch).length === 0) { skipped += 1; continue; }
      const { error } = await sb.from('his_files').update(patch).eq('id', row.id);
      if (error) throw new Error(`row ${row.id}: ${error.message}`);
      changed += 1;
    }
  }

  // The guard the drop migration will apply, shown here so nobody is surprised.
  const { count: missing } = await sb.from('his_files')
    .select('id', { count: 'exact', head: true }).not('phone', 'is', null).is('phone_hmac', null);
  console.log(`${mode}: ${changed} rows changed, ${skipped} unchanged, ${noKey} skipped for missing data key, ${byUser.size} members`);
  console.log(`rows with a phone and no phone_hmac (must be 0 before dropping phone_normalized): ${missing ?? 'unknown'}`);
  if (noKey > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
