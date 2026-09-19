/**
 * Encrypts, or decrypts, the journal fields of every his_files row in place.
 *
 *   npm run journal:encrypt -- --dry-run
 *   npm run journal:encrypt -- --apply    --user you@example.com
 *   npm run journal:encrypt -- --apply
 *   npm run journal:encrypt -- --rollback [--user you@example.com]
 *
 * --user limits the run to one member. Encrypt your own account first, check
 * His Files, a saved report and Compare in the browser, then run for all.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * VERITY_MASTER_KEY in the environment. Run it locally, not on Vercel.
 * Refuses to run unless VERITY_MASTER_KEY opens every data key the deployed
 * app has already written, so a key that does not match Vercel fails here
 * instead of producing ciphertext production cannot read.
 *
 * Before --apply or --rollback touches a row it calls his_files_snapshot(),
 * which copies the whole table to his_files_snapshot_<timestamp>, reachable
 * only by the service role. That is the restore point. Drop it once the run
 * has been verified; it holds whatever the table held before the rewrite.
 *
 * This is a script rather than a SQL migration because pgcrypto has no
 * AES-GCM. It is idempotent: a value that is already ciphertext is skipped on
 * apply, a value that is plaintext is skipped on rollback, so it can be run
 * again after a partial failure.
 *
 * Order of operations for the first run: deploy the code that reads both
 * plaintext and ciphertext (lib/hisfile.ts does), then run --apply. Rows are
 * readable throughout. Rollback decrypts every field and leaves the wrapped
 * data keys on user_profiles in place; they are harmless without ciphertext.
 */
import { createClient } from '@supabase/supabase-js';
import {
  decryptFields, encryptFields, generateDataKey, isCiphertext, unwrapDataKey, wrapDataKey,
} from '../lib/crypto';
import { ENCRYPTED_FIELDS } from '../lib/hisfile';
import { assertMasterKeyMatchesProduction } from './lib/keycheck';

type Mode = 'dry-run' | 'apply' | 'rollback';

function parseArgs(): { mode: Mode; user?: string } {
  const args = process.argv.slice(2);
  const mode = (['--dry-run', '--apply', '--rollback'] as const).find((m) => args.includes(m));
  if (!mode) {
    console.error('Usage: encrypt-journal.ts --dry-run | --apply | --rollback [--user email]');
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
  dates?: unknown;
  [k: string]: unknown;
}

async function main() {
  const { mode, user } = parseArgs();
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

  // Every row, paged, grouped by member.
  const byUser = new Map<string, Row[]>();
  const PAGE = 500;
  for (let from = 0; ; from += PAGE) {
    let q = sb.from('his_files').select('*').order('id').range(from, from + PAGE - 1);
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

  let changed = 0, skipped = 0, keysCreated = 0;

  for (const [userId, rows] of byUser) {
    const { data: prof, error: pErr } = await sb
      .from('user_profiles').select('data_key_enc').eq('user_id', userId).maybeSingle();
    if (pErr) throw pErr;

    let key: Buffer | null = prof?.data_key_enc ? unwrapDataKey(prof.data_key_enc, userId) : null;

    if (!key && mode === 'apply') {
      key = generateDataKey();
      const wrapped = wrapDataKey(key, userId);
      const write = prof
        ? sb.from('user_profiles').update({ data_key_enc: wrapped }).eq('user_id', userId).is('data_key_enc', null)
        : sb.from('user_profiles').insert({ user_id: userId, email: userId, data_key_enc: wrapped });
      const { error } = await write;
      if (error) throw error;
      keysCreated += 1;
    }
    if (!key && mode === 'dry-run') {
      const needs = rows.some((r) => ENCRYPTED_FIELDS.some((f) => r[f] != null && !isCiphertext(r[f])));
      if (needs) console.log(`[dry-run] would create data key for ${userId}`);
    }
    if (!key && mode === 'rollback') {
      // No key means nothing of hers was ever encrypted.
      skipped += rows.length;
      continue;
    }

    for (const row of rows) {
      const before: Record<string, unknown> = {};
      for (const f of ENCRYPTED_FIELDS) before[f] = row[f];

      let after: Record<string, unknown>;
      if (mode === 'rollback') {
        after = decryptFields(key!, before, ENCRYPTED_FIELDS);
      } else if (key) {
        after = encryptFields(key, before, ENCRYPTED_FIELDS);
      } else {
        after = before; // dry-run without a key: report only
      }

      const patch: Record<string, unknown> = {};
      for (const f of ENCRYPTED_FIELDS) if (after[f] !== before[f]) patch[f] = after[f];

      // Keep the plaintext date count in step. On rollback `after.dates` is the
      // array; on apply the array is whatever the row held before sealing.
      const datesPlain = mode === 'rollback' ? after.dates : (isCiphertext(before.dates) ? undefined : before.dates);
      if (Array.isArray(datesPlain) && row.date_count !== datesPlain.length) patch.date_count = datesPlain.length;

      if (Object.keys(patch).length === 0) { skipped += 1; continue; }

      if (mode === 'dry-run') {
        console.log(`[dry-run] ${userId} ${row.id}: would change ${Object.keys(patch).join(', ')}`);
        changed += 1;
        continue;
      }

      const { error } = await sb.from('his_files').update(patch).eq('id', row.id);
      if (error) throw new Error(`row ${row.id}: ${error.message}`);
      changed += 1;
    }
  }

  console.log(`${mode}: ${changed} rows changed, ${skipped} unchanged, ${keysCreated} data keys created, ${byUser.size} members`);
}

main().catch((e) => { console.error(e); process.exit(1); });
