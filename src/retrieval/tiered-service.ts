import type Database from 'bun:sqlite';
import type { SemanticSearchResult } from '../types/knowledge-item';
import type {
  Tier1Context,
  Tier2Options,
  Tier2Results,
  Tier3Options,
  Tier3Results,
  UsageBoostedResult,
  Tier4Options,
  TieredRetrievalResult,
  DiversificationStrategy,
  DiversityMetrics,
} from '../types/retrieval';
import {
  estimateTokens,
  countItemTokens,
  countTotalTokens,
} from '../types/retrieval';
import {
  getProjectFingerprint,
  getRecentWins,
  trackItemAccess,
  getKnowledgeItemById,
  getItemsWithEmbeddings,
} from '../db/operations';
import { findTopK } from '../embeddings/similarity';
import { getEmbeddingService } from '../embeddings';
import { prepareQueryForEmbedding } from '../embeddings';

/**
 * Tier 1: Project Fingerprint
 * Provides always-on foundational project context
 */
export async function getTier1Context(
  db: Database,
  project?: string
): Promise<Tier1Context> {
  const fingerprint = getProjectFingerprint(db, project);
  const recentWins = getRecentWins(db, project, 5);

  const tokenCount =
    estimateTokens(JSON.stringify(fingerprint)) +
    recentWins.reduce((sum, item) => sum + countItemTokens(item), 0);

  return {
    fingerprint,
    recentWins,
    tokenCount,
  };
}

/**
 * Tier 2: Enhanced Semantic Search
 * Vector similarity with optional tag filtering
 */
export async function getTier2Results(
  db: Database,
  options: Tier2Options
): Promise<Tier2Results> {
  // If no query provided, fall back to recent items
  if (!options.query || options.query.trim() === '') {
    return getTier2FallbackResults(db, options);
  }

  try {
    // Generate query embedding
    const service = getEmbeddingService();
    const preparedQuery = prepareQueryForEmbedding(options.query);
    const queryEmbedding = await service.generateEmbedding(preparedQuery);

    // Get items with embeddings (with optional filters)
    const itemsWithEmbeddings = getItemsWithEmbeddings(db, {
      project: options.project,
      type: options.type as any,
    });

    if (itemsWithEmbeddings.length === 0) {
      return {
        results: [],
        tokenCount: 0,
      };
    }

    // Find most similar items
    let results = findTopK(
      queryEmbedding,
      itemsWithEmbeddings,
      options.limit || 20,
      options.threshold || 0.5
    );

    // Apply tag filtering if specified
    if (options.tags && options.tags.length > 0) {
      results = results.filter((result) => {
        if (!result.item.tags || result.item.tags.length === 0) {
          return false;
        }
        return options.tags!.some((tag) => result.item.tags!.includes(tag));
      });
    }

    const tokenCount = countTotalTokens(results);

    return {
      results,
      tokenCount,
    };
  } catch (error) {
    console.error('[getTier2Results] Error:', error);
    // Fallback to non-semantic search on error
    return getTier2FallbackResults(db, options);
  }
}

/**
 * Fallback for Tier 2 when no query provided
 * Returns most recent items matching filters
 */
function getTier2FallbackResults(
  db: Database,
  options: Tier2Options
): Tier2Results {
  const conditions: string[] = [];
  const values: any[] = [];

  if (options.project) {
    conditions.push('project = ?');
    values.push(options.project);
  }

  if (options.type) {
    conditions.push('type = ?');
    values.push(options.type);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 20;

  const sql = `
    SELECT * FROM knowledge_items
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  const stmt = db.query(sql);
  const rows = stmt.all(...values, limit) as any[];

  const items = rows.map((row) => ({
    id: row.id,
    project: row.project,
    file_context: row.file_context,
    type: row.type,
    summary: row.summary,
    content: row.content,
    decision_rationale: row.decision_rationale || undefined,
    alternatives_considered: row.alternatives_considered
      ? JSON.parse(row.alternatives_considered)
      : undefined,
    solution_verified: row.solution_verified === 1,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    related_issues: row.related_issues ? JSON.parse(row.related_issues) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const results: SemanticSearchResult[] = items.map((item) => ({
    item,
    similarity: 1.0, // Perfect similarity for fallback results
  }));

  const tokenCount = countTotalTokens(results);

  return {
    results,
    tokenCount,
  };
}

/**
 * Calculate usage score based on access patterns
 * Combines frequency and recency with time decay
 */
function calculateUsageScore(
  accessCount: number,
  lastAccessedAt: string | null,
  timeDecayDays: number = 30
): number {
  // No access data
  if (accessCount === 0 || !lastAccessedAt) {
    return 0;
  }

  // Calculate time decay (recent access matters more)
  const lastAccess = new Date(lastAccessedAt).getTime();
  const now = Date.now();
  const daysSinceAccess = (now - lastAccess) / (1000 * 60 * 60 * 24);

  // Exponential decay: score decreases with age
  const timeDecay = Math.exp(-daysSinceAccess / timeDecayDays);

  // Normalize access count (log scale to prevent dominance)
  const frequencyScore = Math.log(accessCount + 1) / 10; // Divisor tunes the impact

  // Combine time decay and frequency
  return Math.min(frequencyScore * timeDecay, 1.0);
}

/**
 * Tier 3: Usage-Boosted Search
 * Combines semantic similarity with usage patterns
 */
export async function getTier3Results(
  db: Database,
  options: Tier3Options
): Promise<Tier3Results> {
  // Start with Tier 2 results
  const tier2 = await getTier2Results(db, options);

  const boostFactor = options.boostFactor ?? 0.2;
  const timeDecayDays = options.timeDecayDays ?? 30;
  const minAccessCount = options.minAccessCount ?? 1;

  // Fetch usage data for all results
  const resultsWithUsage: UsageBoostedResult[] = await Promise.all(
    tier2.results.map(async (result) => {
      const item = await getKnowledgeItemById(db, result.item.id);
      if (!item) {
        return {
          ...result,
          baseSimilarity: result.similarity,
          usageScore: 0,
          boostedSimilarity: result.similarity,
        };
      }

      // Cast item to include usage tracking fields
      const itemWithAccess = item as any;
      const accessCount = itemWithAccess.access_count || 0;
      const lastAccessedAt = itemWithAccess.last_accessed_at || null;

      // Skip items below minimum access count
      if (accessCount < minAccessCount) {
        return {
          ...result,
          baseSimilarity: result.similarity,
          usageScore: 0,
          boostedSimilarity: result.similarity,
        };
      }

      const usageScore = calculateUsageScore(accessCount, lastAccessedAt, timeDecayDays);
      const boostedSimilarity = Math.min(
        result.similarity + usageScore * boostFactor,
        1.0
      );

      return {
        ...result,
        baseSimilarity: result.similarity,
        usageScore,
        boostedSimilarity,
      };
    })
  );

  // Sort by boosted similarity
  resultsWithUsage.sort((a, b) => b.boostedSimilarity - a.boostedSimilarity);

  const tokenCount = countTotalTokens(resultsWithUsage);

  return {
    results: resultsWithUsage,
    tokenCount,
  };
}

/**
 * Calculate diversity metrics for a set of results
 */
export function calculateDiversityMetrics(
  results: SemanticSearchResult[]
): DiversityMetrics {
  if (results.length === 0) {
    return {
      score: 0,
      typeDistribution: {},
      projectDistribution: {},
      typeDominance: false,
      projectDominance: false,
    };
  }

  // Count by type
  const typeDistribution: Record<string, number> = {};
  results.forEach((result) => {
    const type = result.item.type;
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  });

  // Count by project
  const projectDistribution: Record<string, number> = {};
  results.forEach((result) => {
    const project = result.item.project;
    projectDistribution[project] = (projectDistribution[project] || 0) + 1;
  });

  // Calculate dominance
  const maxTypeCount = Math.max(...Object.values(typeDistribution));
  const maxProjectCount = Math.max(...Object.values(projectDistribution));
  const typeDominance = maxTypeCount > results.length * 0.5;
  const projectDominance = maxProjectCount > results.length * 0.5;

  // Calculate diversity score (0-1, higher is more diverse)
  // Based on entropy of distributions
  const total = results.length;
  const typeEntropy = Object.values(typeDistribution).reduce((sum, count) => {
    const p = count / total;
    return sum - p * Math.log(p);
  }, 0);
  const projectEntropy = Object.values(projectDistribution).reduce((sum, count) => {
    const p = count / total;
    return sum - p * Math.log(p);
  }, 0);

  // Normalize entropy (max is log(n))
  const maxTypeEntropy = Math.log(Object.keys(typeDistribution).length || 1);
  const maxProjectEntropy = Math.log(Object.keys(projectDistribution).length || 1);

  const typeDiversity = maxTypeEntropy > 0 ? typeEntropy / maxTypeEntropy : 0;
  const projectDiversity = maxProjectEntropy > 0 ? projectEntropy / maxProjectEntropy : 0;

  const score = (typeDiversity + projectDiversity) / 2;

  return {
    score,
    typeDistribution,
    projectDistribution,
    typeDominance,
    projectDominance,
  };
}

/**
 * Apply diversification using round-robin selection
 * Prevents dominance by any single type or project
 */
export function applyDiversification(
  results: SemanticSearchResult[],
  strategy: DiversificationStrategy
): SemanticSearchResult[] {
  if (strategy === 'none' || results.length === 0) {
    return results;
  }

  // Group results by the specified criteria
  const groups = new Map<string, SemanticSearchResult[]>();

  results.forEach((result) => {
    let key: string;

    if (strategy === 'type') {
      key = result.item.type;
    } else if (strategy === 'project') {
      key = result.item.project;
    } else {
      // both: combine type and project
      key = `${result.item.project}:${result.item.type}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  });

  // Round-robin selection from each group
  const diversified: SemanticSearchResult[] = [];
  const iterators = Array.from(groups.values()).map((group) => group[Symbol.iterator]());
  let round = 0;

  while (iterators.length > 0) {
    const iteratorsToRemove: number[] = [];

    for (let i = 0; i < iterators.length; i++) {
      const { value, done } = iterators[i].next();

      if (done) {
        iteratorsToRemove.push(i);
      } else {
        diversified.push(value);
      }
    }

    // Remove exhausted iterators (in reverse order to maintain indices)
    iteratorsToRemove.reverse().forEach((index) => {
      iterators.splice(index, 1);
    });

    round++;

    // Safety limit to prevent infinite loops
    if (round > results.length) {
      break;
    }
  }

  return diversified;
}

/**
 * Enforce token budget by truncating results
 * Allows small overflow (10%) to avoid cutting off mid-item
 */
export function enforceTokenBudget(
  results: SemanticSearchResult[],
  budget: number
): { results: SemanticSearchResult[]; enforced: boolean } {
  let totalTokens = 0;
  const withinBudget: SemanticSearchResult[] = [];
  const overBudget: SemanticSearchResult[] = [];

  for (const result of results) {
    const itemTokens = countItemTokens(result.item);

    if (totalTokens + itemTokens <= budget * 1.1) {
      // Allow 10% overflow
      withinBudget.push(result);
      totalTokens += itemTokens;
    } else {
      overBudget.push(result);
    }
  }

  return {
    results: withinBudget,
    enforced: overBudget.length > 0,
  };
}

/**
 * Deduplicate results by ID
 * Keeps the result with highest similarity score
 */
export function deduplicateResults(
  results: SemanticSearchResult[]
): SemanticSearchResult[] {
  const bestById = new Map<string, SemanticSearchResult>();

  results.forEach((result) => {
    const existing = bestById.get(result.item.id);
    if (!existing || result.similarity > existing.similarity) {
      bestById.set(result.item.id, result);
    }
  });

  return Array.from(bestById.values());
}

/**
 * Tier 4: Smart Capping with Diversity
 * Orchestrates all tiers and applies intelligent capping
 */
export async function getTier4Results(
  db: Database,
  query: string,
  options: Tier4Options = {}
): Promise<TieredRetrievalResult> {
  const tokenBudget = options.tokenBudget || 8000;
  const diversify = options.diversify || 'type';
  const includeTier1 = options.includeTier1 !== false;
  const includeTier2 = options.includeTier2 !== false;
  const includeTier3 = options.includeTier3 || false;

  // Collect enabled tier results
  const allResults: SemanticSearchResult[] = [];
  let tier1: Tier1Context | undefined;
  let tier2: Tier2Results | undefined;
  let tier3: Tier3Results | undefined;

  // Tier 1: Project context (if enabled)
  if (includeTier1) {
    tier1 = await getTier1Context(db, options.project);
  }

  // Tier 2 or Tier 3: Search results
  if (includeTier3) {
    tier3 = await getTier3Results(db, {
      query,
      project: options.project,
      limit: 50,
      threshold: 0.4,
    });
    allResults.push(...tier3.results);
  } else if (includeTier2) {
    tier2 = await getTier2Results(db, {
      query,
      project: options.project,
      limit: 50,
      threshold: 0.4,
    });
    allResults.push(...tier2.results);
  }

  // Deduplicate by ID
  const deduplicated = deduplicateResults(allResults);

  // Apply diversification
  const diversified = applyDiversification(deduplicated, diversify);

  // Enforce token budget
  const { results: finalResults, enforced: budgetEnforced } = enforceTokenBudget(
    diversified,
    tokenBudget
  );

  // Track usage for returned items (fire-and-forget)
  setImmediate(() => {
    finalResults.forEach((result) => {
      try {
        trackItemAccess(db, result.item.id);
      } catch (error) {
        // Silently fail to avoid blocking
        console.error(`Failed to track access for ${result.item.id}:`, error);
      }
    });
  });

  // Calculate diversity score
  const diversityMetrics = calculateDiversityMetrics(finalResults);

  // Calculate total tokens
  const totalTokens = finalResults.reduce(
    (sum, result) => sum + countItemTokens(result.item),
    0
  );

  return {
    tier1,
    tier2,
    tier3,
    finalResults,
    totalTokens,
    budgetEnforced,
    diversityScore: diversityMetrics.score,
  };
}
