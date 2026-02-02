import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to disable local model checks
env.allowLocalModels = false;
env.allowRemoteModels = true;

/**
 * Model configuration for Xenova/all-MiniLM-L6-v2
 * 384 dimensions, quantized for efficiency
 */
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384;

/**
 * Singleton class for generating embeddings using Transformers.js
 * Lazily loads the model on first use
 */
export class EmbeddingService {
  private static instance: EmbeddingService | null = null;
  private model: Awaited<ReturnType<typeof pipeline>> | null = null;
  private initializing: Promise<boolean> | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the model (lazy loading)
   * Only downloads and loads on first call
   */
  private async initialize(): Promise<boolean> {
    if (this.model) {
      return true;
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      try {
        this.model = await pipeline(
          'feature-extraction',
          MODEL_NAME
        );
        console.log('[Embeddings] Model loaded successfully');
        return true;
      } catch (error) {
        console.error('[Embeddings] Failed to load model:', error);
        throw error;
      }
    })();

    return this.initializing;
  }

  /**
   * Generate embedding for a single text
   * @param text - Input text to embed
   * @returns Promise<number[]> - 384-dimensional vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Embedding model not initialized');
    }

    const startTime = Date.now();

    // Generate embedding
    const output = await this.model(text, {
      pooling: 'mean',
      normalize: true,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Embeddings] Generated embedding in ${elapsed}ms`);

    // Extract the vector from output
    // The output is a tensor, we need to get the data array
    const outputData = output as { data: number[]; dims: number[] };
    const vector = Array.from(outputData.data);

    // Verify dimensions
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Unexpected embedding dimension: ${vector.length} (expected ${EMBEDDING_DIMENSIONS})`
      );
    }

    return vector;
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of input texts
   * @returns Promise<number[][]> - Array of 384-dimensional vectors
   */
  async generateBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    await this.initialize();

    if (!this.model) {
      throw new Error('Embedding model not initialized');
    }

    const startTime = Date.now();

    // Process in batches of 8 to avoid memory issues
    const batchSize = 8;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const outputs = await this.model(batch, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract vectors from batch output
      const outputData = outputs as { data: number[]; dims: number[] };
      for (let j = 0; j < batch.length; j++) {
        const startIndex = j * EMBEDDING_DIMENSIONS;
        const endIndex = startIndex + EMBEDDING_DIMENSIONS;
        const vector = Array.from(outputData.data.slice(startIndex, endIndex));
        results.push(vector);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Embeddings] Generated ${texts.length} embeddings in ${elapsed}ms (${(elapsed / texts.length).toFixed(1)}ms per item)`);

    return results;
  }

  /**
   * Get the model name being used
   */
  getModelName(): string {
    return MODEL_NAME;
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }

  /**
   * Check if model is loaded
   */
  isReady(): boolean {
    return this.model !== null;
  }
}

/**
 * Convenience function to get the singleton instance
 */
export function getEmbeddingService(): EmbeddingService {
  return EmbeddingService.getInstance();
}
