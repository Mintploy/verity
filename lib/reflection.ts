/**
 * The questions she answers about herself around a date, as 1 to 5 sliders.
 *
 * Versioned so the wording can change without breaking what she already
 * answered. Answers are stored on the date entry keyed by item id
 * (`beforeAnswers`, `afterAnswers` in lib/journal.ts), and the entry records
 * which version the ids belong to. A future V2 uses new ids or a new version
 * number; V1 answers keep meaning V1 questions.
 *
 * `dimension` and `reverse` are for reading patterns later. They are never
 * shown to her. Nothing in the UI calls these a test, an assessment or a
 * score; they are questions, and the sliders are optional.
 *
 * `reverse`: when true, a high answer means less of the dimension, so a
 * reader flips it (6 minus the answer). As worded today, every item reads
 * high-is-more, so all are false. The flag exists so a future rewording that
 * inverts a scale does not silently invert the data.
 */

export type ReflectionDimension = 'anxiety' | 'avoidance';

export interface ReflectionItem {
  id: string;
  prompt: string;
  /** Label under the left end of the slider (answer 1). */
  low: string;
  /** Label under the right end of the slider (answer 5). */
  high: string;
  dimension: ReflectionDimension;
  reverse: boolean;
}

export const REFLECTION_VERSION = 1;

export const REFLECTION_ITEMS_V1: { before: readonly ReflectionItem[]; after: readonly ReflectionItem[] } = {
  before: [
    {
      id: 'b1',
      prompt: 'How often have you checked for a message from him today?',
      low: 'not at all', high: 'constantly',
      dimension: 'anxiety', reverse: false,
    },
    {
      id: 'b2',
      prompt: 'If he went quiet for a day this week, how much did that unsettle you?',
      low: 'not at all', high: 'a lot',
      dimension: 'anxiety', reverse: false,
    },
    {
      id: 'b3',
      prompt: 'How much of yourself are you planning to hold back tonight?',
      low: 'none', high: 'most of it',
      dimension: 'avoidance', reverse: false,
    },
  ],
  after: [
    {
      id: 'a1',
      prompt: 'How soon do you want to hear from him?',
      low: 'no rush', high: 'immediately',
      dimension: 'anxiety', reverse: false,
    },
    {
      id: 'a2',
      prompt: "If he doesn't text tomorrow, how will you feel?",
      low: 'fine', high: 'awful',
      dimension: 'anxiety', reverse: false,
    },
    {
      id: 'a3',
      prompt: 'How comfortable were you letting him see something real?',
      low: 'very', high: 'not at all',
      dimension: 'avoidance', reverse: false,
    },
    {
      id: 'a4',
      prompt: 'Did you find yourself performing a version of yourself?',
      low: 'not at all', high: 'the whole time',
      dimension: 'avoidance', reverse: false,
    },
  ],
};

export const REFLECTION_MIN = 1;
export const REFLECTION_MAX = 5;

/** A valid answer, or undefined. Anything outside 1 to 5 is treated as unanswered. */
export function asAnswer(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) && v >= REFLECTION_MIN && v <= REFLECTION_MAX ? v : undefined;
}
