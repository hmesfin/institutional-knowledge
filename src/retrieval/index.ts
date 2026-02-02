export {
  getTier1Context,
  getTier2Results,
  getTier3Results,
  getTier4Results,
  calculateDiversityMetrics,
  applyDiversification,
  enforceTokenBudget,
  deduplicateResults,
} from './tiered-service';

export type {
  Tier1Context,
  Tier2Options,
  Tier2Results,
  Tier3Options,
  Tier3Results,
  Tier4Options,
  TieredRetrievalResult,
  DiversificationStrategy,
  DiversityMetrics,
} from '../types/retrieval';

export {
  estimateTokens,
  countItemTokens,
  countTotalTokens,
} from '../types/retrieval';
