/**
 * Fail-fast checks for server-side configuration.
 *
 * Several clients (Stripe, Resend) are constructed with a placeholder when their
 * key is absent, so a missing key surfaces later as a confusing 401 from the
 * vendor rather than as "you forgot to set this". These helpers let a route say
 * so plainly instead.
 */

/** Returns the names of any listed vars that are unset or empty. */
export function missingEnv(names: string[]): string[] {
  return names.filter(n => !process.env[n]?.trim());
}

/**
 * Logs which vars are missing and returns a 503 the caller can return directly,
 * or null when everything is present. The response body never names the vars —
 * that detail goes to the server log only.
 */
export function configErrorResponse(names: string[], context: string): Response | null {
  const missing = missingEnv(names);
  if (missing.length === 0) return null;

  console.error(
    `[config] ${context} is unavailable: missing ${missing.join(', ')}. ` +
      `Set these in .env.local (local) or the Vercel project settings (deployed).`,
  );

  return Response.json(
    { error: 'Sign-in is temporarily unavailable. Please try again shortly.' },
    { status: 503 },
  );
}
