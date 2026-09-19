import { SignJWT, jwtVerify } from 'jose';

const MAGIC_SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET!);
const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

/**
 * What a session proves: who she is. Nothing else.
 *
 * Plan, verification and the Stripe customer live on user_profiles and are
 * read when a request needs them (lib/access.ts). Putting them in the token
 * meant a two-hour-old fact could gate a request, and meant a token had to
 * be re-issued to change what she could do.
 */
export interface SessionPayload {
  email: string;
}

/**
 * Canonical form of an email address for identity purposes.
 *
 * The email is the user_id for His Files, quota, profile and the audit log,
 * so an uppercase variant would open a second, empty vault for the same
 * woman. Normalize wherever an address enters the system, never at the point
 * of use.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email: normalizeEmail(email), purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(MAGIC_SECRET);
}

export async function verifyMagicLinkToken(token: string): Promise<{ email: string }> {
  const { payload } = await jwtVerify(token, MAGIC_SECRET);
  if (payload.purpose !== 'magic-link' || typeof payload.email !== 'string') throw new Error('Invalid token');
  return { email: normalizeEmail(payload.email) };
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: normalizeEmail(payload.email), purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(SESSION_SECRET);
}

/**
 * Sessions issued before the purpose claim existed carry none; they stay
 * valid so nobody is signed out by the change. A token with any other
 * purpose (a magic link, a candidate) is never a session.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, SESSION_SECRET);
  if (payload.purpose !== undefined && payload.purpose !== 'session') throw new Error('Not a session token');
  if (typeof payload.email !== 'string') throw new Error('Invalid session');
  return { email: normalizeEmail(payload.email) };
}

export const SESSION_COOKIE = 'verity-session';
export const PENDING_EMAIL_COOKIE = 'verity-pending-email';
