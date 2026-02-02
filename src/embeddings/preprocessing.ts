import type { KnowledgeItem } from '../types/knowledge-item';

/**
 * Maximum content length to include in embedding text
 * Longer content is truncated to avoid token limits
 */
const MAX_CONTENT_LENGTH = 500;

/**
 * Delimiter used to separate fields in the prepared text
 */
const DELIMITER = ' | ';

/**
 * Prepare text for embedding generation from a knowledge item
 *
 * Strategy:
 * - Include summary twice to emphasize importance
 * - Include type and tags for context
 * - Include truncated content (first 500 chars)
 * - Use consistent delimiters
 *
 * @param item - Knowledge item to prepare
 * @returns Formatted string ready for embedding
 */
export function prepareTextForEmbedding(item: KnowledgeItem): string {
  const parts: string[] = [];

  // Summary is most important, include it twice
  parts.push(`Summary: ${item.summary}`);
  parts.push(`Summary: ${item.summary}`);

  // Type provides important context
  parts.push(`Type: ${item.type}`);

  // Tags if present
  if (item.tags && item.tags.length > 0) {
    parts.push(`Tags: ${item.tags.join(', ')}`);
  }

  // Content (truncated)
  const content = item.content.length > MAX_CONTENT_LENGTH
    ? item.content.substring(0, MAX_CONTENT_LENGTH)
    : item.content;
  parts.push(`Content: ${content}`);

  // Additional context fields if present
  if (item.decision_rationale) {
    parts.push(`Rationale: ${item.decision_rationale}`);
  }

  if (item.alternatives_considered && item.alternatives_considered.length > 0) {
    parts.push(`Alternatives: ${item.alternatives_considered.join(', ')}`);
  }

  return parts.join(DELIMITER);
}

/**
 * Prepare raw text for embedding generation
 * Used for search query embedding
 *
 * @param text - Raw query text
 * @returns Formatted string ready for embedding
 */
export function prepareQueryForEmbedding(text: string): string {
  return text.trim();
}
