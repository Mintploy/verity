import { SignJWT, jwtVerify } from 'jose';
import type { PersonCandidate } from './apis/enformion';

const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET!);

/**
 * A candidate as the browser sees it.
 *
 * The TahoeId is deliberately absent. It is a key into a metered third-party
 * database, so handing it to an unauthenticated page would let anyone script
 * paid record lookups against our account and bypass the picker entirely.
 * Instead each candidate carries a short-lived signed token that names the
 * TahoeId we resolved, and the report route accepts only that. The client can
 * choose among the men we offered; it cannot ask for one we did not.
 */
export interface PublicCandidate {
  token: string;
  name: string;
  age?: number;
  city?: string;
  state?: string;
}

/** Binds a candidate to the number it was found on, for 30 minutes. */
export async function signCandidate(c: PersonCandidate, phone: string): Promise<string> {
  return new SignJWT({ tahoeId: c.tahoeId, phone, purpose: 'candidate' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(SECRET);
}

export async function verifyCandidate(
  token: string,
): Promise<{ tahoeId: string; phone: string }> {
  const { payload } = await jwtVerify(token, SECRET);
  if (payload.purpose !== 'candidate') throw new Error('Invalid candidate token');
  return { tahoeId: payload.tahoeId as string, phone: payload.phone as string };
}

export async function toPublicCandidates(
  candidates: PersonCandidate[],
  phone: string,
): Promise<PublicCandidate[]> {
  return Promise.all(
    candidates.map(async (c) => ({
      token: await signCandidate(c, phone),
      name: c.name,
      age: c.age,
      city: c.city,
      state: c.state,
    })),
  );
}
