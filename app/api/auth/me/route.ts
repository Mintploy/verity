import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return Response.json({ authenticated: false });
    const payload = await verifySessionToken(token);
    return Response.json({ authenticated: true, email: payload.email, userId: payload.email });
  } catch {
    return Response.json({ authenticated: false });
  }
}
