// Name-based social media candidate generator.
// Produces inferred profile search links — user must verify manually.

export interface SocialCandidate {
  platform: string;
  handle: string;
  url: string;
  verified: boolean;
}

export function generateSocialCandidates(fullName?: string): SocialCandidate[] {
  if (!fullName) return [];
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return [];
  const [first, ...rest] = parts;
  const last = rest[rest.length - 1];
  const primary = `${first}${last}`;
  const dotted = `${first}.${last}`;

  return [
    { platform: 'LinkedIn', handle: dotted, url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(fullName)}`, verified: false },
    { platform: 'Instagram', handle: `@${primary}`, url: `https://www.instagram.com/${primary}/`, verified: false },
    { platform: 'Facebook', handle: fullName, url: `https://www.facebook.com/search/people?q=${encodeURIComponent(fullName)}`, verified: false },
    { platform: 'X / Twitter', handle: `@${primary}`, url: `https://x.com/search?q=${encodeURIComponent(fullName)}&f=user`, verified: false },
    { platform: 'TikTok', handle: `@${primary}`, url: `https://www.tiktok.com/@${primary}`, verified: false },
  ];
}
