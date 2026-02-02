export {
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  INTENSIFIERS,
  PROBLEM_INDICATORS,
  SOLUTION_INDICATORS,
  isPositiveWord,
  isNegativeWord,
  getIntensifier,
  isProblemIndicator,
  isSolutionIndicator,
} from './lexicon';

export type { SentimentPolarity, Intensity, SentimentWord } from './lexicon';

export {
  analyzeSentiment,
  splitIntoSegments,
  createSentimentTimeline,
  detectSentimentShifts,
  hasProblemToSolutionTransition,
} from './analyzer';

export type {
  SentimentScore,
  TextSegment,
  SentimentTimeline,
  SentimentShift,
} from './analyzer';
