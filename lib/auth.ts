import { SignJWT, jwtVerify } from 'jose';

const MAGIC_SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET!);
const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export interface SessionPayload {
  email: string;
  stripeCustomerId: string;
  identityVerified: boolean;
}

export async function createMagicLinkToken(email: string, stripeCustomerId: string): Promise<string> {
  return new SignJWT({ email, stripeCustomerId, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(MAGIC_SECRET);
}

export async function verifyMagicLinkToken(token: string): Promise<{ email: string; stripeCustomerId: string }> {
  const { payload } = await jwtVerify(token, MAGIC_SECRET);
  if (payload.purpose !== 'magic-link') throw new Error('Invalid token');
  return { email: payload.email as string, stripeCustomerId: payload.stripeCustomerId as string };
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SESSION_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, SESSION_SECRET);
  return payload as unknown as SessionPayload;
}

export const SESSION_COOKIE = 'verity-session';
export const PENDING_EMAIL_COOKIE = 'verity-pending-email';
