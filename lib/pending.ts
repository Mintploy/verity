/**
 * The number she typed before she had an account.
 *
 * She enters his number on the landing page, then goes through ID verification
 * and Stripe before we show her anything. That is several redirects and an
 * email, so the number has to outlive all of them — being asked to type it
 * again after paying is the kind of small friction that reads as the product
 * losing her place.
 *
 * A cookie rather than sessionStorage: the welcome email's sign-in link often
 * opens in a new tab, and sessionStorage does not survive that. Not httpOnly,
 * because the client is what reads it back.
 */
const KEY = 'verity-pending-phone';
const MAX_AGE = 60 * 60; // An hour is long enough to verify and pay, not longer.

export function setPendingPhone(phone: string): void {
  const digits = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (digits.length !== 10) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${KEY}=${digits}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function getPendingPhone(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${KEY}=(\\d{10})`));
  return match ? match[1] : null;
}

export function clearPendingPhone(): void {
  document.cookie = `${KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}
