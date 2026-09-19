import type { SupabaseClient } from '@supabase/supabase-js';
import { isWrappedWithCurrentKey } from '../../lib/crypto';

/**
 * Refuses to proceed unless the local VERITY_MASTER_KEY is the one production
 * is using.
 *
 * The only evidence available is the data keys the deployed app has already
 * wrapped. If the local key opens every one of them, it is the same key. If
 * it opens none, it is not, and writing ciphertext with it would leave
 * production unable to read anything this script touches. If there are no
 * data keys at all there is nothing to check against, and the script refuses
 * too: save any His File in the production app first so one exists.
 *
 * Deliberately does not consult VERITY_MASTER_KEY_PREVIOUS: a migration must
 * run on the current key. Finish a rotation first.
 */
export async function assertMasterKeyMatchesProduction(sb: SupabaseClient): Promise<void> {
  const { data, error } = await sb
    .from('user_profiles')
    .select('user_id, data_key_enc')
    .not('data_key_enc', 'is', null);
  if (error) throw error;

  const rows = (data ?? []) as Array<{ user_id: string; data_key_enc: string }>;
  if (rows.length === 0) {
    console.error(
      'REFUSED: no data key exists yet, so VERITY_MASTER_KEY cannot be checked against production.\n' +
      'Sign in to the production site and save or edit any His File entry; that writes a data key\n' +
      'under the deployed key. Then run this again.',
    );
    process.exit(3);
  }

  const bad = rows.filter((r) => !isWrappedWithCurrentKey(r.data_key_enc, r.user_id));
  if (bad.length > 0) {
    console.error(
      `REFUSED: VERITY_MASTER_KEY does not open ${bad.length} of ${rows.length} existing data keys.\n` +
      'The local key is not the one production is using. Copy the value from the Vercel project\n' +
      'settings into .env.local exactly, with no quotes or trailing spaces, and run again.',
    );
    process.exit(3);
  }

  console.log(`master key check: opens all ${rows.length} existing data key(s), matches production`);
}
