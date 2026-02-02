import type { KnowledgeItem, SemanticSearchResult } from './knowledge-item';
import type { ProjectFingerprint } from '../db/operations';

/**
 * Token counting utilities
 */

/**
 * Estimate token count for text
 * Rough estimate: 1 token ≈ 4 characters
 * This is a conservative estimate for English text
 */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens in a knowledge item
 * Sums all text fields for accurate token budgeting
 */
export function countItemTokens(item: KnowledgeItem): number {
  return (
    estimateTokens(item.summary) +
    estimateTokens(item.content) +
    estimateTokens(item.file_context) +
    estimateTokens(item.decision_rationale || '') +
    estimateTokens(item.alternatives_considered?.join(' ') || '') +
    estimateTokens(item.tags?.join(' ') || '') +
    estimateTokens(item.related_issues?.join(' ') || '')
  );
}

/**
 * Count total tokens in search results
 */
export function countTotalTokens(results: SemanticSearchResult[]): number {
  return results.reduce((sum, result) => sum + countItemTokens(result.item), 0);
}

/**
 * Tier 1: Project Fingerprint
 */

/**
 * Tier 1 context provides always-on foundational understanding
 */
export interface Tier1Context {
  /** Project statistics */
  fingerprint: ProjectFingerprint;
  /** Recent wins for morale and pattern recognition */
  recentWins: KnowledgeItem[];
  /** Total token count for this tier */
  tokenCount: number;
}

/**
 * Tier 2: Enhanced Semantic Search
 */

/**
 * Enhanced semantic search options with tag filtering
 */
export interface Tier2Options {
  /** Query text for semantic search */
  query: string;
  /** Maximum results to return */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Filter by project */
  project?: string;
  /** Filter by knowledge item type */
  type?: string;
  /** Filter by tags (any match) */
  tags?: string[];
}

/**
 * Tier 2 results with similarity scores
 */
export interface Tier2Results {
  /** Search results ranked by similarity */
  results: SemanticSearchResult[];
  /** Total token count for this tier */
  tokenCount: number;
}

/**
 * Tier 3: Usage-Boosted Search
 */

/**
 * Options for usage-boosted search
 */
export interface Tier3Options extends Tier2Options {
  /** How much to boost based on usage (0-1, default: 0.2) */
  boostFactor?: number;
  /** Time decay in days (older access patterns matter less, default: 30) */
  timeDecayDays?: number;
  /** Minimum access count to consider */
  minAccessCount?: number;
}

/**
 * Usage-boosted search result with adjusted similarity
 */
export interface UsageBoostedResult extends SemanticSearchResult {
  /** Original similarity score */
  baseSimilarity: number;
  /** Usage score (0-1) */
  usageScore: number;
  /** Boosted similarity score */
  boostedSimilarity: number;
}

/**
 * Tier 3 results with usage boosting applied
 */
export interface Tier3Results {
  /** Results ranked by boosted similarity */
  results: UsageBoostedResult[];
  /** Total token count for this tier */
  tokenCount: number;
}

/**
 * Tier 4: Smart Capping with Diversity
 */

/**
 * Diversification strategy for preventing dominance
 */
export type DiversificationStrategy =
  | 'none' // No diversification
  | 'type' // Diversify across knowledge item types
  | 'project' // Diversify across projects
  | 'both'; // Diversify across both type and project

/**
 * Options for smart capped retrieval
 */
export interface Tier4Options {
  /** Token budget (default: 8000) */
  tokenBudget?: number;
  /** Diversification strategy (default: 'type') */
  diversify?: DiversificationStrategy;
  /** Whether to include Tier 1 context (default: true) */
  includeTier1?: boolean;
  /** Whether to use Tier 2 semantic search (default: true) */
  includeTier2?: boolean;
  /** Whether to use Tier 3 usage boosting (default: false) */
  includeTier3?: boolean;
  /** Filter by project name */
  project?: string;
}

/**
 * Combined tiered retrieval results
 */
export interface TieredRetrievalResult {
  /** Tier 1: Project context (if enabled) */
  tier1?: Tier1Context;
  /** Tier 2: Semantic search results (if enabled) */
  tier2?: Tier2Results;
  /** Tier 3: Usage-boosted results (if enabled) */
  tier3?: Tier3Results;
  /** Final results after diversification and token capping */
  finalResults: SemanticSearchResult[];
  /** Total token count across all tiers */
  totalTokens: number;
  /** Whether token budget was enforced */
  budgetEnforced: boolean;
  /** Diversity score (0-1, higher is more diverse) */
  diversityScore: number;
}

/**
 * Tier configuration for fine-grained control
 */
export interface TierConfig {
  /** Whether to enable this tier */
  enabled: boolean;
  /** Maximum results from this tier */
  maxResults?: number;
  /** Minimum similarity threshold for this tier */
  minThreshold?: number;
  /** Custom options for this tier */
  options?: any;
}

/**
 * Complete tiered retrieval request
 */
export interface TieredRetrievalRequest {
  /** Search query */
  query: string;
  /** Filter by project */
  project?: string;
  /** Configuration for each tier */
  tierConfig?: {
    tier1?: Partial<TierConfig>;
    tier2?: Partial<TierConfig>;
    tier3?: Partial<TierConfig>;
  };
  /** Token budget for final results */
  tokenBudget?: number;
  /** Diversification strategy */
  diversify?: DiversificationStrategy;
}

/**
 * Diversity metrics for analysis
 */
export interface DiversityMetrics {
  /** Overall diversity score (0-1) */
  score: number;
  /** Count of items by type */
  typeDistribution: Record<string, number>;
  /** Count of items by project */
  projectDistribution: Record<string, number>;
  /** Whether any single type dominates (>50%) */
  typeDominance: boolean;
  /** Whether any single project dominates (>50%) */
  projectDominance: boolean;
}
