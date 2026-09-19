import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Envelope encryption for journal content.
 *
 * Two layers. VERITY_MASTER_KEY, from the environment, wraps one 256-bit data
 * key per member. That data key, stored wrapped on her user_profiles row,
 * encrypts the free-text and feeling fields on her His Files. The plaintext
 * data key exists only in server memory for the duration of a request.
 *
 * AES-256-GCM throughout. Each ciphertext carries its own random 96-bit IV and
 * 128-bit auth tag, so tampering or a wrong key fails loudly instead of
 * returning garbage. Rotating the master key means re-wrapping data keys, not
 * re-encrypting content; deleting her profile row deletes her data key, which
 * makes anything the row deletion missed unreadable.
 *
 * Format, one string, base64url parts: `v1.<iv>.<tag>.<ciphertext>`. Stored
 * as-is in text columns and as a JSON string in jsonb columns, so no column
 * type changes and a rollback is a rewrite in place.
 *
 * This module has no Supabase or Next imports on purpose: the migration script
 * in scripts/ runs it outside the app.
 */

export const CIPHERTEXT_PREFIX = 'v1.';

const ALG = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/** Thrown when the master key is missing or malformed. Routes turn this into a 503. */
export class CryptoConfigError extends Error {}

export function masterKey(): Buffer {
  const raw = process.env.VERITY_MASTER_KEY?.trim();
  if (!raw) throw new CryptoConfigError('VERITY_MASTER_KEY is not set');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new CryptoConfigError('VERITY_MASTER_KEY must be 32 bytes, as 64 hex chars or base64');
  }
  return key;
}

export function generateDataKey(): Buffer {
  return randomBytes(KEY_BYTES);
}

export function isCiphertext(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(CIPHERTEXT_PREFIX);
}

const b64 = (b: Buffer) => b.toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url');

/**
 * Encrypts bytes under a key. `aad` is authenticated but not encrypted: it
 * binds the ciphertext to a context (which member's key this is) so a blob
 * moved to another row or column will not decrypt.
 */
export function encryptBytes(key: Buffer, plaintext: Buffer, aad?: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${CIPHERTEXT_PREFIX}${b64(iv)}.${b64(tag)}.${b64(ct)}`;
}

export function decryptBytes(key: Buffer, blob: string, aad?: string): Buffer {
  if (!isCiphertext(blob)) throw new Error('Not a v1 ciphertext');
  const parts = blob.slice(CIPHERTEXT_PREFIX.length).split('.');
  if (parts.length !== 3) throw new Error('Malformed ciphertext');
  const [iv, tag, ct] = parts.map(unb64);
  const decipher = createDecipheriv(ALG, key, iv);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** Wraps a member's data key under the master key, bound to her user id. */
export function wrapDataKey(dataKey: Buffer, userId: string): string {
  return encryptBytes(masterKey(), dataKey, `dk:${userId}`);
}

export function unwrapDataKey(wrapped: string, userId: string): Buffer {
  const key = decryptBytes(masterKey(), wrapped, `dk:${userId}`);
  if (key.length !== KEY_BYTES) throw new Error('Unwrapped data key has the wrong length');
  return key;
}

/**
 * A JSON-serialisable value to ciphertext and back. Everything goes through
 * JSON, strings included, so a text column and a jsonb column are handled the
 * same way and the type survives the round trip.
 */
export function encryptValue(key: Buffer, value: unknown): string {
  return encryptBytes(key, Buffer.from(JSON.stringify(value), 'utf8'));
}

export function decryptValue<T = unknown>(key: Buffer, blob: string): T {
  return JSON.parse(decryptBytes(key, blob).toString('utf8')) as T;
}

/**
 * Encrypt the named fields of a row in place. Fields that are absent, null,
 * or already ciphertext are left alone, which makes this safe to run twice
 * and safe during the window where a row may hold either form.
 */
export function encryptFields<T extends object>(key: Buffer, row: T, fields: readonly string[]): T {
  const out = { ...row } as Record<string, unknown>;
  for (const f of fields) {
    const v = out[f];
    if (v === undefined || v === null || isCiphertext(v)) continue;
    out[f] = encryptValue(key, v);
  }
  return out as unknown as T;
}

/** The inverse. Plaintext values pass through untouched. */
export function decryptFields<T extends object>(key: Buffer, row: T, fields: readonly string[]): T {
  const out = { ...row } as Record<string, unknown>;
  for (const f of fields) {
    const v = out[f];
    if (!isCiphertext(v)) continue;
    out[f] = decryptValue(key, v);
  }
  return out as unknown as T;
}
