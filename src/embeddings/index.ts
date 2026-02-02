/**
 * Embeddings module
 *
 * Provides local embedding generation and semantic search capabilities
 * using Transformers.js and the Xenova/all-MiniLM-L6-v2 model
 */

export { EmbeddingService, getEmbeddingService } from './service';
export { prepareTextForEmbedding, prepareQueryForEmbedding } from './preprocessing';
