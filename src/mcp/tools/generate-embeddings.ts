import { z } from 'zod';
import Database from 'bun:sqlite';

/**
 * Input schema for generate_embeddings tool
 */
export const GenerateEmbeddingsInputSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
});

export type GenerateEmbeddingsInput = z.infer<typeof GenerateEmbeddingsInputSchema>;

/**
 * Generate embeddings tool
 * Backfills embeddings for existing knowledge items
 */
export const generate_embeddings_tool = {
  name: 'generate_embeddings',
  description:
    'Generate embeddings for knowledge items that don\'t have them yet. ' +
    'Use this to backfill embeddings for existing items after enabling semantic search. ' +
    'Process is async and runs in batches for efficiency.',
  inputSchema: GenerateEmbeddingsInputSchema,

  async execute(params: GenerateEmbeddingsInput, context: { db: Database }) {
    const { limit } = params;

    try {
      // Import required modules
      const { getEmbeddingService } = await import('../../embeddings');
      const { prepareTextForEmbedding } = await import('../../embeddings');
      const { getItemsWithoutEmbeddings, updateItemEmbedding } = await import('../../db/operations');

      // Get items without embeddings
      const items = getItemsWithoutEmbeddings(context.db, limit);

      if (items.length === 0) {
        return {
          success: true,
          processed: 0,
          message: 'All items already have embeddings',
        };
      }

      // Initialize embedding service
      const service = getEmbeddingService();
      const modelName = service.getModelName();

      // Generate embeddings in batch
      const startTime = Date.now();
      const texts = items.map(prepareTextForEmbedding);
      const embeddings = await service.generateBatch(texts);

      // Update each item with its embedding
      for (let i = 0; i < items.length; i++) {
        updateItemEmbedding(context.db, items[i].id, embeddings[i], modelName);
      }

      const elapsed = Date.now() - startTime;

      return {
        success: true,
        processed: items.length,
        elapsed_ms: elapsed,
        message: `Generated embeddings for ${items.length} items in ${elapsed}ms`,
      };
    } catch (error) {
      console.error('[generate_embeddings] Error:', error);
      return {
        success: false,
        processed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
