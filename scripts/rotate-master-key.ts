/**
 * Rotates VERITY_MASTER_KEY by re-wrapping every member's data key.
 *
 * Envelope encryption means the content is never touched: each member's
 * 256-bit data key is unwrapped with the old master key and wrapped again
 * with the new one. One row per member, one small ciphertext each.
 *
 * Procedure, in this order, so the app never loses the ability to read:
 *
 *   1. Generate the new key:  openssl rand -hex 32
 *   2. In Vercel, move the current value of VERITY_MASTER_KEY into
 *      VERITY_MASTER_KEY_PREVIOUS and put the new key in VERITY_MASTER_KEY.
 *      Redeploy. The app now wraps with the new key and unwraps with either.
 *   3. Locally, with the same two variables plus NEXT_PUBLIC_SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY:
 *        npm run keys:rotate -- --dry-run
 *        npm run keys:rotate -- --apply
 *   4. When --apply reports 0 remaining, remove VERITY_MASTER_KEY_PREVIOUS
 *      from Vercel and redeploy.
 *
 * Idempotent: a data key already wrapped with the current key is skipped, so
 * a partial run is resumed by running again. Each write is conditional on the
 * wrapped value being the one that was read, so a member saving a file mid-run
 * cannot have her freshly written key overwritten with a stale one.
 */
import { createClient } from '@supabase/supabase-js';
import { isWrappedWithCurrentKey, previousMasterKey, unwrapDataKey, wrapDataKey } from '../lib/crypto';

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) { console.error(`${name} is not set`); process.exit(2); }
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (!apply && !args.includes('--dry-run')) {
    console.error('Usage: rotate-master-key.ts --dry-run | --apply');
    process.exit(2);
  }
  required('VERITY_MASTER_KEY');
  if (!previousMasterKey()) {
    console.error('VERITY_MASTER_KEY_PREVIOUS is not set. Nothing to rotate from.');
    process.exit(2);
  }

  const sb = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from('user_profiles')
    .select('user_id, data_key_enc')
    .not('data_key_enc', 'is', null);
  if (error) throw error;

  let rewrapped = 0, already = 0, failed = 0, raced = 0;

  for (const row of data ?? []) {
    const userId: string = row.user_id;
    const wrapped: string = row.data_key_enc;

    if (isWrappedWithCurrentKey(wrapped, userId)) { already += 1; continue; }

    let dataKey: Buffer;
    try {
      dataKey = unwrapDataKey(wrapped, userId); // falls back to the previous key
    } catch (e) {
      failed += 1;
      console.error(`${userId}: cannot unwrap with either key: ${String(e)}`);
      continue;
    }

    if (!apply) { rewrapped += 1; continue; }

    const next = wrapDataKey(dataKey, userId);
    const { data: won, error: upErr } = await sb
      .from('user_profiles')
      .update({ data_key_enc: next })
      .eq('user_id', userId)
      .eq('data_key_enc', wrapped)
      .select('user_id');
    if (upErr) throw upErr;
    if (won?.length) rewrapped += 1; else raced += 1;
  }

  const remaining = failed + raced;
  console.log(
    `${apply ? 'apply' : 'dry-run'}: ${rewrapped} ${apply ? 're-wrapped' : 'to re-wrap'}, ` +
    `${already} already on the current key, ${raced} changed underneath (run again), ${failed} unreadable. ` +
    `${remaining} remaining.`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
