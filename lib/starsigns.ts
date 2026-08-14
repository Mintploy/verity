export type StarSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' | 'Leo' | 'Virgo'
  | 'Libra' | 'Scorpio' | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export const SIGN_EMOJI: Record<StarSign, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋', Leo: '♌', Virgo: '♍',
  Libra: '♎', Scorpio: '♏', Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export function getStarSign(dob: string): StarSign | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Aries';
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Taurus';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Gemini';
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Cancer';
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Leo';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Virgo';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Libra';
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Scorpio';
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Sagittarius';
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Capricorn';
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

export interface CompatibilityResult {
  score: number;
  rating: string;
  summary: string;
}

function key(a: StarSign, b: StarSign): string {
  return [a, b].sort().join('-');
}

const COMPAT: Record<string, CompatibilityResult> = {
  // ── Same sign ──────────────────────────────────────────────────────────────
  'Aries-Aries': { score: 7, rating: 'Electric', summary: 'Two fire starters in the same room — thrilling until someone needs to be the one who listens.' },
  'Taurus-Taurus': { score: 8, rating: 'Deeply grounded', summary: 'Shared values, shared pleasures, shared stubbornness. A soft and solid match when neither digs in their heels.' },
  'Gemini-Gemini': { score: 7, rating: 'Brilliantly chaotic', summary: 'The conversations never end and neither does the restlessness — double the wit, double the need for novelty.' },
  'Cancer-Cancer': { score: 8, rating: 'A safe harbor', summary: 'Two empaths who speak the same emotional language — beautiful when secure, consuming when anxious.' },
  'Leo-Leo': { score: 7, rating: 'Radiant rivals', summary: 'Undeniable chemistry, but someone has to hold the spotlight and neither of you wants to share it.' },
  'Virgo-Virgo': { score: 8, rating: 'Quietly excellent', summary: 'Mutual standards and shared devotion to getting it right — just don\'t let the critique outweigh the warmth.' },
  'Libra-Libra': { score: 7, rating: 'Beautiful but indecisive', summary: 'Charming, aesthetic, harmonious — until a decision needs making and both of you defer to the other indefinitely.' },
  'Scorpio-Scorpio': { score: 8, rating: 'Intense and fated', summary: 'A bond that feels written in the stars — passionate, loyal, and fierce. The intensity is the point.' },
  'Sagittarius-Sagittarius': { score: 8, rating: 'Wild and free', summary: 'Adventure partners who understand each other\'s need for space — this one could genuinely go the distance.' },
  'Capricorn-Capricorn': { score: 8, rating: 'Built to last', summary: 'Two builders with the same long-term blueprint — respect, ambition, and slow-burning devotion.' },
  'Aquarius-Aquarius': { score: 7, rating: 'Visionary pairing', summary: 'You\'ll change the world together, or at least argue about how to — just don\'t mistake intellectual resonance for emotional depth.' },
  'Pisces-Pisces': { score: 8, rating: 'Dreamy and soft', summary: 'An almost psychic emotional connection — guard against dissolving into each other entirely.' },

  // ── Fire-Fire ──────────────────────────────────────────────────────────────
  'Aries-Leo': { score: 9, rating: 'Highly compatible', summary: 'A power couple in every room they enter — Aries lights the match, Leo keeps the fire burning.' },
  'Aries-Sagittarius': { score: 9, rating: 'Highly compatible', summary: 'Spontaneous, energetic, and endlessly optimistic — these two keep each other alive in the best way.' },
  'Leo-Sagittarius': { score: 9, rating: 'Magnetic and joyful', summary: 'Joy, generosity, and an unshakeable belief in the good life — a natural and radiant partnership.' },

  // ── Earth-Earth ────────────────────────────────────────────────────────────
  'Taurus-Virgo': { score: 8, rating: 'Grounded and loyal', summary: 'Practical, devoted, and quietly romantic — they build something real together over time.' },
  'Taurus-Capricorn': { score: 8, rating: 'Built to last', summary: 'Shared values, shared ambition, and a mutual love of comfort and security — steady and deeply satisfying.' },
  'Capricorn-Virgo': { score: 8, rating: 'A power partnership', summary: 'Two perfectionists who appreciate each other\'s dedication — this is the couple that quietly conquers everything.' },

  // ── Air-Air ────────────────────────────────────────────────────────────────
  'Gemini-Libra': { score: 8, rating: 'Socially brilliant', summary: 'Witty, charming, and endlessly interesting to each other — a salon of two.' },
  'Gemini-Aquarius': { score: 9, rating: 'Intellectually electric', summary: 'A meeting of extraordinary minds — these two can talk forever and never run out of new ideas to explore.' },
  'Libra-Aquarius': { score: 8, rating: 'Ideally matched', summary: 'A partnership built on principle and elegance — they champion each other and the world simultaneously.' },

  // ── Water-Water ────────────────────────────────────────────────────────────
  'Cancer-Scorpio': { score: 9, rating: 'Deeply bonded', summary: 'An almost wordless understanding between two deeply feeling souls — protective, passionate, and enduring.' },
  'Cancer-Pisces': { score: 9, rating: 'Soul-level connection', summary: 'Two intuitive hearts who speak in feelings rather than words — a genuinely transcendent emotional match.' },
  'Scorpio-Pisces': { score: 9, rating: 'Fated and profound', summary: 'Scorpio provides the anchor; Pisces provides the poetry — together they feel like a love story already written.' },

  // ── Fire-Air (fan the flames) ───────────────────────────────────────────────
  'Aries-Gemini': { score: 8, rating: 'Fast and fun', summary: 'Quick-witted and spontaneous — the pace keeps both of them engaged without smothering either.' },
  'Aries-Libra': { score: 7, rating: 'Opposites attract', summary: 'The classic push-pull — Aries charges forward while Libra weighs every option. The tension is the spark.' },
  'Aries-Aquarius': { score: 8, rating: 'Bold and unconventional', summary: 'Two independent spirits who respect each other\'s autonomy and share a taste for the new.' },
  'Leo-Gemini': { score: 8, rating: 'Dazzling duo', summary: 'Leo brings the warmth, Gemini brings the words — together they\'re the most entertaining pair in any room.' },
  'Leo-Libra': { score: 8, rating: 'Glamorous and warm', summary: 'Beauty, charm, and a genuine appreciation for each other\'s taste — this one looks good from every angle.' },
  'Leo-Aquarius': { score: 7, rating: 'Opposites with chemistry', summary: 'Leo rules the heart; Aquarius rules the mind. Each has what the other secretly wants most.' },
  'Gemini-Sagittarius': { score: 7, rating: 'Opposites and equals', summary: 'Mutual wanderlust and a love of learning — the axis of curiosity makes this pair feel like coming home.' },
  'Libra-Sagittarius': { score: 8, rating: 'Expansive and easy', summary: 'An effortless pairing of optimism and elegance — they bring out the best in each other.' },
  'Aquarius-Sagittarius': { score: 9, rating: 'Freedom-seekers', summary: 'Neither wants to be caged and neither will try to cage the other — a rare and liberating love.' },

  // ── Earth-Water (nourishing) ────────────────────────────────────────────────
  'Taurus-Cancer': { score: 8, rating: 'Tender and lasting', summary: 'Taurus builds the home; Cancer fills it with love. A quietly beautiful match.' },
  'Taurus-Scorpio': { score: 7, rating: 'Opposites of depth', summary: 'Magnetic and complex — the stubbornness on both sides is real, but so is the loyalty.' },
  'Taurus-Pisces': { score: 8, rating: 'Soft and protective', summary: 'Taurus gives Pisces the safe harbor they\'ve been looking for; Pisces gives Taurus a world with more color.' },
  'Virgo-Cancer': { score: 8, rating: 'Caring and devoted', summary: 'Virgo shows love through service; Cancer shows it through nurturing. They understand each other at the deepest level.' },
  'Virgo-Scorpio': { score: 8, rating: 'Quietly intense', summary: 'Analytical meets intuitive — they see through each other and choose to stay anyway.' },
  'Virgo-Pisces': { score: 7, rating: 'Complementary opposites', summary: 'Virgo brings order to Pisces\'s beautiful chaos; Pisces teaches Virgo how to feel without analysis.' },
  'Capricorn-Cancer': { score: 7, rating: 'Opposites in balance', summary: 'Structure and softness — Cancer needs the stability Capricorn provides; Capricorn thaws with Cancer\'s warmth.' },
  'Capricorn-Scorpio': { score: 9, rating: 'Power and depth', summary: 'Two signs that take commitment seriously — ambitious, intense, and built for the long game.' },
  'Capricorn-Pisces': { score: 7, rating: 'Dream and discipline', summary: 'Capricorn gives Pisces\'s dreams a foundation; Pisces gives Capricorn a reason to feel.' },

  // ── Fire-Earth (friction) ───────────────────────────────────────────────────
  'Aries-Taurus': { score: 5, rating: 'Proceed carefully', summary: 'Aries wants to leap; Taurus wants to deliberate. The pace alone will require real compromise.' },
  'Aries-Virgo': { score: 5, rating: 'Friction ahead', summary: 'Aries acts first and asks later; Virgo analyzes until the moment has passed. Patience on both sides is essential.' },
  'Aries-Capricorn': { score: 5, rating: 'Wills in collision', summary: 'Two leaders, two methods, one partnership. It can work, but someone has to occasionally yield.' },
  'Leo-Taurus': { score: 6, rating: 'Stubborn beauty', summary: 'Shared love of luxury and loyalty, but two fixed signs mean two immovable positions — flexibility is the work.' },
  'Leo-Virgo': { score: 5, rating: 'Tricky but workable', summary: 'Leo wants grand gestures; Virgo wants precision. The appreciation has to go both ways or this stalls.' },
  'Leo-Capricorn': { score: 6, rating: 'Ambition meets ambition', summary: 'Both want to be the best — they can either compete or build an empire together. The choice is theirs.' },
  'Sagittarius-Taurus': { score: 4, rating: 'A real stretch', summary: 'Sagittarius craves the open road; Taurus needs roots and ritual. This one asks a lot of both.' },
  'Sagittarius-Virgo': { score: 4, rating: 'A challenging pairing', summary: 'Sagittarius runs on instinct; Virgo runs on precision. Finding common ground here requires genuine effort.' },
  'Sagittarius-Capricorn': { score: 6, rating: 'Possible but demanding', summary: 'Capricorn sees Sagittarius as reckless; Sagittarius sees Capricorn as rigid. But shared ambition can bridge the gap.' },

  // ── Air-Earth ──────────────────────────────────────────────────────────────
  'Gemini-Taurus': { score: 5, rating: 'Different speeds', summary: 'Gemini wants novelty; Taurus wants consistency. This works better as a slow burn than a flash.' },
  'Gemini-Virgo': { score: 6, rating: 'Sharp minds, different goals', summary: 'Both mercury-ruled and mentally agile, but Gemini scatters while Virgo narrows — agreeing on direction takes work.' },
  'Gemini-Capricorn': { score: 5, rating: 'Worlds apart', summary: 'Gemini lives in ideas; Capricorn lives in results. The respect is there; the rhythm needs finding.' },
  'Libra-Taurus': { score: 7, rating: 'Refined and sensual', summary: 'Both Venus-ruled and drawn to beauty — a genuinely pleasant pairing with real aesthetic harmony.' },
  'Libra-Virgo': { score: 6, rating: 'Thoughtful but strained', summary: 'Both analytical and careful, but Virgo\'s critique can bruise Libra\'s need for peace. Kindness is the key.' },
  'Libra-Capricorn': { score: 5, rating: 'Possible with work', summary: 'Libra seeks balance and ease; Capricorn seeks achievement. This needs mutual respect of the other\'s priorities.' },
  'Aquarius-Taurus': { score: 4, rating: 'A difficult fit', summary: 'Aquarius disrupts; Taurus preserves. These two want opposite things from stability and will need to negotiate everything.' },
  'Aquarius-Virgo': { score: 5, rating: 'Intellectuals, different worlds', summary: 'Both precise and observant, but Aquarius thinks in systems while Virgo thinks in details — alignment takes time.' },
  'Aquarius-Capricorn': { score: 6, rating: 'Unconventional ambition', summary: "Capricorn's discipline meets Aquarius's vision — an unusual but potentially powerful pair if egos stay in check." },

  // ── Fire-Water ─────────────────────────────────────────────────────────────
  'Aries-Cancer': { score: 5, rating: 'Tender and turbulent', summary: 'Aries charges forward; Cancer needs to feel safe first. The care is real, but the timing is hard.' },
  'Aries-Scorpio': { score: 6, rating: 'Magnetic and combustible', summary: 'An undeniable draw — but two signs this intense need extraordinary self-awareness to avoid scorching each other.' },
  'Aries-Pisces': { score: 6, rating: 'Protective chemistry', summary: 'Aries instinctively protects; Pisces instinctively softens — there\'s sweetness here if both honor the difference.' },
  'Leo-Cancer': { score: 6, rating: 'Warm but complex', summary: 'Leo loves to be adored; Cancer loves to give devotion. Beautiful when secure, but both need a lot of reassurance.' },
  'Leo-Scorpio': { score: 6, rating: 'A battle of depths', summary: 'Two fixed and powerful signs — the passion runs deep, and so does the potential for standoffs.' },
  'Leo-Pisces': { score: 7, rating: 'Romantic and luminous', summary: 'Leo brings the light; Pisces brings the magic. At their best, they inspire each other into their finest selves.' },
  'Sagittarius-Cancer': { score: 4, rating: 'Tender mismatch', summary: 'Cancer needs a home base; Sagittarius needs an open road. Both deserve to have what they need — just likely not from each other.' },
  'Sagittarius-Scorpio': { score: 5, rating: 'Intense but misaligned', summary: 'Scorpio digs in; Sagittarius moves on. The initial heat is real, but the long game requires significant compromise.' },
  'Sagittarius-Pisces': { score: 6, rating: 'Spiritual seekers', summary: 'Two signs drawn to meaning and transcendence — romantic and expansive, though both can drift without an anchor.' },

  // ── Air-Water ──────────────────────────────────────────────────────────────
  'Gemini-Cancer': { score: 6, rating: 'Mind meets heart', summary: 'Gemini processes the world through thought; Cancer through feeling. Beautiful when each can learn the other\'s language.' },
  'Gemini-Scorpio': { score: 5, rating: 'Curious and suspicious', summary: 'Gemini\'s lightness unsettles Scorpio\'s intensity — this needs deep patience and a lot of direct communication.' },
  'Gemini-Pisces': { score: 6, rating: 'Dreamy but unstable', summary: 'Two mutable signs who drift in the same current — lovely in the moment, harder to sustain over time.' },
  'Libra-Cancer': { score: 6, rating: 'Gentle and caring', summary: 'Both deeply relational and people-focused — warm and tender, though Cancer\'s emotional tides can unsettle Libra\'s equilibrium.' },
  'Libra-Scorpio': { score: 6, rating: 'Dark and bright', summary: 'Libra draws Scorpio out into the light; Scorpio gives Libra the depth they quietly crave. A complex but compelling tension.' },
  'Libra-Pisces': { score: 7, rating: 'Romantic and flowing', summary: 'Two signs who believe in love and beauty — idealistic and tender, best when at least one of them stays grounded.' },
  'Aquarius-Cancer': { score: 5, rating: 'Head vs. heart', summary: 'Aquarius lives in the abstract; Cancer lives in the emotional. This gap can be bridged — but not by accident.' },
  'Aquarius-Scorpio': { score: 5, rating: 'Magnetic and guarded', summary: 'Both are intensely private and fiercely independent — the attraction is real, but neither trusts easily.' },
  'Aquarius-Pisces': { score: 7, rating: 'Idealistic and compassionate', summary: 'Both care about something larger than themselves — a quietly profound pairing when grounded in day-to-day reality.' },
};

const DEFAULT: CompatibilityResult = { score: 6, rating: 'Neutral ground', summary: 'The stars are taking their time on this one — proceed with curiosity and let the connection speak for itself.' };

export function getCompatibility(sign1: StarSign, sign2: StarSign): CompatibilityResult {
  return COMPAT[key(sign1, sign2)] ?? DEFAULT;
}
