import type { SemanticSearchResult } from '../types/knowledge-item';
import type { KnowledgeItem } from '../types/knowledge-item';

/**
 * Calculate cosine similarity between two vectors
 *
 * Formula: (A · B) / (||A|| * ||B||)
 * Returns value between -1 and 1, where 1 is identical direction
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  if (a.length === 0) {
    throw new Error('Cannot calculate similarity of empty vectors');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Find top K most similar items to a query embedding
 *
 * @param queryEmbedding - Query vector to compare against
 * @param items - Array of items with their embeddings
 * @param k - Maximum number of results to return
 * @param threshold - Minimum similarity score (0-1)
 * @returns Sorted array of results, highest similarity first
 */
export function findTopK(
  queryEmbedding: number[],
  items: Array<{ embedding: number[]; item: KnowledgeItem }>,
  k: number,
  threshold: number
): SemanticSearchResult[] {
  const startTime = Date.now();

  // Calculate similarities for all items
  const results: SemanticSearchResult[] = items
    .map(({ item, embedding }) => ({
      item,
      similarity: cosineSimilarity(queryEmbedding, embedding),
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  const elapsed = Date.now() - startTime;
  console.log(`[Similarity] Found ${results.length} results in ${elapsed}ms (compared ${items.length} items)`);

  return results;
}

/**
 * Calculate similarity between two knowledge items
 * Useful for finding duplicates or related items
 *
 * @param embedding1 - First item's embedding
 * @param embedding2 - Second item's embedding
 * @returns Similarity score between 0 and 1
 */
export function compareItems(embedding1: number[], embedding2: number[]): number {
  return cosineSimilarity(embedding1, embedding2);
}

/**
 * Check if two embeddings are semantically similar
 * Uses a threshold of 0.8 for high similarity
 *
 * @param embedding1 - First item's embedding
 * @param embedding2 - Second item's embedding
 * @param threshold - Minimum similarity to consider "similar" (default 0.8)
 * @returns True if items are similar above threshold
 */
export function areSimilar(
  embedding1: number[],
  embedding2: number[],
  threshold: number = 0.8
): boolean {
  return cosineSimilarity(embedding1, embedding2) >= threshold;
}
