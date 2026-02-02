import { z } from 'zod';
import Database from 'bun:sqlite';
import type { SemanticSearchResult } from '../../types/knowledge-item';

/**
 * Input schema for semantic_search tool
 */
export const SemanticSearchInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().int().min(1).max(100).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.5),
  project: z.string().optional(),
  type: z.enum(['solution', 'pattern', 'gotcha', 'win', 'troubleshooting']).optional(),
});

export type SemanticSearchInput = z.infer<typeof SemanticSearchInputSchema>;

/**
 * Semantic search tool
 * Finds conceptually similar knowledge items using vector embeddings
 */
export const semantic_search_tool = {
  name: 'semantic_search',
  description:
    'Search for knowledge items by semantic meaning rather than exact keywords. ' +
    'Finds conceptually similar items even without exact matches. ' +
    'Supports filtering by project and type.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string' as const,
        description: 'Search query for semantic similarity matching',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of results to return (default: 10, max: 100)',
        minimum: 1,
        maximum: 100,
      },
      threshold: {
        type: 'number' as const,
        description: 'Minimum similarity threshold (0-1, default: 0.5)',
        minimum: 0,
        maximum: 1,
      },
      project: {
        type: 'string' as const,
        description: 'Filter by project name (optional)',
      },
      type: {
        type: 'string' as const,
        enum: ['solution', 'pattern', 'gotcha', 'win', 'troubleshooting'],
        description: 'Filter by knowledge item type (optional)',
      },
    },
    required: ['query'] as const,
  },

  async execute(params: SemanticSearchInput, context: { db: Database }) {
    const { query, limit, threshold, project, type } = params;

    try {
      // Import embeddings modules
      const { getEmbeddingService } = await import('../../embeddings');
      const { prepareQueryForEmbedding } = await import('../../embeddings');
      const { findTopK } = await import('../../embeddings/similarity');
      const { getItemsWithEmbeddings } = await import('../../db/operations');

      // Generate query embedding
      const service = getEmbeddingService();
      const preparedQuery = prepareQueryForEmbedding(query);
      const queryEmbedding = await service.generateEmbedding(preparedQuery);

      // Get items with embeddings (with optional filters)
      const itemsWithEmbeddings = getItemsWithEmbeddings(context.db, {
        project,
        type,
      });

      if (itemsWithEmbeddings.length === 0) {
        return {
          success: true,
          results: [],
          message: 'No items with embeddings found. Try generating embeddings first.',
        };
      }

      // Find most similar items
      const results = findTopK(
        queryEmbedding,
        itemsWithEmbeddings,
        limit,
        threshold
      );

      // Track usage for returned items (fire-and-forget)
      setImmediate(() => {
        const { trackItemAccess } = require('../../db/operations');
        results.forEach((r: SemanticSearchResult) => {
          try {
            trackItemAccess(context.db, r.item.id);
          } catch (error) {
            // Silently fail to avoid blocking
            console.error(`Failed to track access for ${r.item.id}:`, error);
          }
        });
      });

      return {
        success: true,
        results: results.map((r: SemanticSearchResult) => ({
          item: {
            id: r.item.id,
            type: r.item.type,
            summary: r.item.summary,
            project: r.item.project,
            similarity: r.similarity,
          },
          similarity: r.similarity,
        })),
        query,
        count: results.length,
      };
    } catch (error) {
      console.error('[semantic_search] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
      };
    }
  },
};
