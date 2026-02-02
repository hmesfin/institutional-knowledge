export {
  DEFAULT_WEIGHTS,
  THRESHOLD_PRESETS,
  getConfidenceLevel,
  calculateTextLengthScore,
  calculateStructureScore,
  createFactor,
} from './types';

export type {
  ConfidenceLevel,
  ConfidenceFactor,
  ConfidenceScore,
  ConfidenceThresholds,
  ScoringWeights,
  ScoringOptions,
} from './types';

export {
  scoreConfidence,
  scoreWithPreset,
  filterByConfidence,
  getRecommendedAction,
} from './scoring';

export {
  recordFeedback,
  getFeedback,
  getAllFeedback,
  calculateWeightAdjustments,
  applyWeightAdjustments,
  getFeedbackStats,
  clearFeedback,
} from './feedback';

export type { FeedbackEntry, WeightAdjustment } from './feedback';
