/**
 * Milestone helpers shared by the His File page and the Timeline page.
 * Pure functions; dates are ISO YYYY-MM-DD and are compared as local days.
 */

export const MILESTONE_SUGGESTIONS: readonly string[] = [
  'First date', 'First kiss', 'Met his friends', 'Made it exclusive', 'Stayed over', 'Met the family', 'First trip',
];

const DAY_MS = 24 * 60 * 60 * 1000;

function atMidnight(iso: string): number {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : NaN;
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  const x = atMidnight(a), y = atMidnight(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  return Math.round((y - x) / DAY_MS);
}

/** "3 days", "2 weeks", "1 month", "1 year 2 months". */
export function describeGap(days: number): string {
  const d = Math.abs(days);
  if (d === 0) return 'the same day';
  if (d === 1) return '1 day';
  if (d < 14) return `${d} days`;
  if (d < 60) return `${Math.round(d / 7)} weeks`;
  if (d < 365) return `${Math.round(d / 30.44)} months`;
  const years = Math.floor(d / 365.25);
  const months = Math.round((d - years * 365.25) / 30.44);
  return months > 0 ? `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''}`;
}

/** "today", "3 days ago", "in 2 weeks". */
export function describeSince(iso: string, today: string = new Date().toISOString().slice(0, 10)): string {
  const days = daysBetween(iso, today);
  if (days === 0) return 'today';
  if (days > 0) return `${describeGap(days)} ago`;
  return `in ${describeGap(days)}`;
}
