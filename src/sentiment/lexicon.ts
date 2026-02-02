/**
 * Sentiment lexicon for rule-based sentiment analysis
 *
 * Words are categorized by polarity and intensity
 */

export type SentimentPolarity = 'positive' | 'negative' | 'neutral';
export type Intensity = 'low' | 'medium' | 'high' | 'extreme';

export interface SentimentWord {
  word: string;
  polarity: SentimentPolarity;
  intensity: number; // -1.0 to 1.0
}

/**
 * Positive sentiment words - indicate solutions, wins, relief
 */
export const POSITIVE_WORDS: Set<string> = new Set([
  // Success/achievement
  'success',
  'successful',
  'successfully',
  'works',
  'working',
  'worked',
  'finally',
  'solved',
  'solution',
  'fixed',
  'fix',
  'resolved',
  'resolve',
  'done',
  'complete',
  'completed',
  'perfect',
  'excellent',
  'great',
  'good',
  'love',
  'amazing',
  'awesome',
  'brilliant',
  'fantastic',
  'happy',
  'glad',
  'relieved',
  'excited',
  'winner',
  'win',
  'breakthrough',
  'victory',
  'triumph',

  // Understanding/insight
  'understand',
  'understood',
  'obvious',
  'clear',
  'click',
  'clicked',
  'makes sense',
  'figured out',
  'realized',
  'found',
  'discover',
  'discovered',
  'learned',

  // Improvement
  'better',
  'improved',
  'improvement',
  'faster',
  'optimized',
  'efficient',
  'smooth',
  'easy',
  'simple',

  // Relief/positive emotion
  'thank god',
  'thank goodness',
  'phew',
  'yay',
  'hooray',
  'yippee',
]);

/**
 * Negative sentiment words - indicate problems, frustration, blockers
 */
export const NEGATIVE_WORDS: Set<string> = new Set([
  // Problem/failure
  'problem',
  'issue',
  'bug',
  'error',
  'exception',
  'fail',
  'failed',
  'failure',
  'broken',
  'broke',
  'doesn\'t work',
  'not working',
  'wrong',
  'bad',
  'terrible',
  'horrible',
  'awful',
  'sucks',
  'hate',
  'frustrating',
  'annoying',
  'pain',
  'struggle',
  'stuck',
  'blocked',
  'blocked',

  // Confusion/lack of understanding
  'confused',
  'confusing',
  'don\'t understand',
  'doesn\'t make sense',
  'no idea',
  'clueless',
  'unclear',
  'uncertain',
  'unsure',

  // Negative emotion
  'angry',
  'mad',
  'upset',
  'sad',
  'depressed',
  'worried',
  'anxious',
  'stressed',
  'overwhelmed',
  'frustrated',
  'irritated',

  // Difficulty
  'hard',
  'difficult',
  'complicated',
  'complex',
  'impossible',
  'struggle',
  'challenge',
  'nightmare',
  'mess',

  // Time-related frustration
  'wasted',
  'hours',
  'days',
  'forever',
  'ages',
]);

/**
 * Intensifiers - words that amplify sentiment
 */
export const INTENSIFIERS: Record<string, number> = {
  // High intensifiers
  very: 1.5,
  really: 1.5,
  extremely: 2.0,
  absolutely: 2.0,
  completely: 2.0,
  totally: 2.0,
  utterly: 2.0,

  // Medium intensifiers
  so: 1.3,
  'just': 1.2,
  'pretty': 1.2,
  quite: 1.2,
  rather: 1.2,

  // Low intensifiers
  slightly: 0.8,
  somewhat: 0.8,
  'kind of': 0.8,
  'kinda': 0.8,
  'a bit': 0.8,
  'a little': 0.8,

  // Negators (reverse polarity)
  not: -1.0,
  'no': -1.0,
  never: -1.0,
  neither: -1.0,
  nor: -1.0,
  nothing: -1.0,
  nobody: -1.0,
  none: -1.0,
  nowhere: -1.0,
  hardly: -0.8,
  barely: -0.8,
  scarcely: -0.8,
};

/**
 * Problem indicators - words that suggest a problem exists
 */
export const PROBLEM_INDICATORS: Set<string> = new Set([
  'bug',
  'error',
  'issue',
  'problem',
  'broken',
  'fail',
  'failed',
  'failure',
  'crash',
  'exception',
  'wrong',
  'stuck',
  'blocked',
  'confused',
  "don't understand",
  'no idea',
  'struggling',
  'frustrated',
  'annoying',
]);

/**
 * Solution indicators - words that suggest a solution was found
 */
export const SOLUTION_INDICATORS: Set<string> = new Set([
  'fix',
  'fixed',
  'solved',
  'solution',
  'works',
  'working',
  'finally',
  'done',
  'complete',
  'success',
  'successful',
  'resolved',
  'found',
  'discover',
  'figured out',
  'realized',
  'understand',
  'clear',
  'obvious',
]);

/**
 * Check if a word is in the positive lexicon
 */
export function isPositiveWord(word: string): boolean {
  return POSITIVE_WORDS.has(word.toLowerCase());
}

/**
 * Check if a word is in the negative lexicon
 */
export function isNegativeWord(word: string): boolean {
  return NEGATIVE_WORDS.has(word.toLowerCase());
}

/**
 * Get the intensifier multiplier for a word
 */
export function getIntensifier(word: string): number {
  return INTENSIFIERS[word.toLowerCase()] || 1.0;
}

/**
 * Check if a word is a problem indicator
 */
export function isProblemIndicator(word: string): boolean {
  return PROBLEM_INDICATORS.has(word.toLowerCase());
}

/**
 * Check if a word is a solution indicator
 */
export function isSolutionIndicator(word: string): boolean {
  return SOLUTION_INDICATORS.has(word.toLowerCase());
}
