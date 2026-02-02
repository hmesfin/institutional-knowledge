export {
  SUCCESS_PATTERNS,
  PROBLEM_PATTERNS,
  SOLUTION_PATTERNS,
  GOTCHA_PATTERNS,
  ALL_PATTERNS,
  getPatternsByType,
  getPatternById,
} from './patterns';

export type { Pattern, PatternType } from './patterns';

export { detectPatterns, extractSummary } from './matcher';

export type {
  PatternMatch,
  DetectionResult,
  MatchOptions,
} from './matcher';
