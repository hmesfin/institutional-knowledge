import { describe, it, expect, beforeAll } from 'bun:test';
import { EmbeddingService } from '../../src/embeddings/service';
import { prepareTextForEmbedding, prepareQueryForEmbedding } from '../../src/embeddings/preprocessing';
import { cosineSimilarity } from '../../src/embeddings/similarity';
import type { KnowledgeItem } from '../../src/types/knowledge-item';

describe('Embedding Quality', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    service = EmbeddingService.getInstance();
    // Ensure model is loaded
    await service.generateEmbedding('test');
  }, 30000);

  it('should generate high similarity (>0.5) for semantically similar texts', async () => {
    const text1 = 'How to fix authentication error in API';
    const text2 = 'Resolving login issues with authentication';

    const emb1 = await service.generateEmbedding(text1);
    const emb2 = await service.generateEmbedding(text2);

    const similarity = cosineSimilarity(emb1, emb2);
    console.log(`Similar texts similarity: ${similarity.toFixed(3)}`);

    expect(similarity).toBeGreaterThan(0.5);
  });

  it('should generate low similarity (<0.4) for semantically dissimilar texts', async () => {
    const text1 = 'Implementing user authentication with JWT tokens';
    const text2 = 'How to bake chocolate chip cookies';

    const emb1 = await service.generateEmbedding(text1);
    const emb2 = await service.generateEmbedding(text2);

    const similarity = cosineSimilarity(emb1, emb2);
    console.log(`Dissimilar texts similarity: ${similarity.toFixed(3)}`);

    expect(similarity).toBeLessThan(0.4);
  });

  it('should generate near-perfect similarity (>0.85) for nearly identical texts', async () => {
    const text1 = 'The user authentication system uses JWT tokens for security';
    const text2 = 'User authentication uses JWT tokens for security';

    const emb1 = await service.generateEmbedding(text1);
    const emb2 = await service.generateEmbedding(text2);

    const similarity = cosineSimilarity(emb1, emb2);
    console.log(`Nearly identical texts similarity: ${similarity.toFixed(3)}`);

    expect(similarity).toBeGreaterThan(0.85);
  });

  it('should handle knowledge item text preparation correctly', async () => {
    const item: KnowledgeItem = {
      id: 'test-1',
      project: 'test-project',
      file_context: 'src/auth.ts',
      type: 'solution',
      summary: 'Fixed JWT authentication error by adding token validation',
      content: 'The issue was that expired tokens were not being properly validated. Added check for token expiration before processing.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const preparedText = prepareTextForEmbedding(item);
    expect(preparedText).toContain('Summary:');
    expect(preparedText).toContain('Fixed JWT authentication error');
    expect(preparedText).toContain('Type: solution');
    expect(preparedText).toContain('Content:');
  });

  it('should handle query preparation correctly', () => {
    const query = '  How to fix JWT errors  ';
    const prepared = prepareQueryForEmbedding(query);

    expect(prepared).toBe('How to fix JWT errors');
  });

  it('should generate consistent embeddings for the same text', async () => {
    const text = 'Consistent embedding generation test';

    const emb1 = await service.generateEmbedding(text);
    const emb2 = await service.generateEmbedding(text);

    expect(emb1).toHaveLength(emb2.length);

    // Check each dimension
    for (let i = 0; i < emb1.length; i++) {
      expect(emb1[i]).toBeCloseTo(emb2[i], 5);
    }

    const similarity = cosineSimilarity(emb1, emb2);
    expect(similarity).toBeCloseTo(1.0, 5);
  });
});

describe('Embedding Performance', () => {
  let service: EmbeddingService;

  beforeAll(async () => {
    service = EmbeddingService.getInstance();
    // Ensure model is loaded
    await service.generateEmbedding('test');
  }, 30000);

  it('should generate single embedding in less than 500ms', async () => {
    const text = 'Performance test for embedding generation';
    const start = Date.now();

    await service.generateEmbedding(text);

    const elapsed = Date.now() - start;
    console.log(`Single embedding generation time: ${elapsed}ms`);

    expect(elapsed).toBeLessThan(500);
  });

  it('should generate batch of 10 embeddings efficiently', async () => {
    const texts = Array.from({ length: 10 }, (_, i) => `Test text number ${i}`);
    const start = Date.now();

    const embeddings = await service.generateBatch(texts);

    const elapsed = Date.now() - start;
    const avgTime = elapsed / texts.length;

    console.log(`Batch embedding generation time: ${elapsed}ms (avg: ${avgTime.toFixed(1)}ms per item)`);

    expect(embeddings).toHaveLength(10);
    expect(avgTime).toBeLessThan(400); // 400ms average per item
  });

  it('should handle batch size of 50 without issues', async () => {
    const texts = Array.from({ length: 50 }, (_, i) => `Test text number ${i}`);
    const start = Date.now();

    const embeddings = await service.generateBatch(texts);

    const elapsed = Date.now() - start;
    console.log(`50-item batch generation time: ${elapsed}ms (${(elapsed / 50).toFixed(1)}ms per item)`);

    expect(embeddings).toHaveLength(50);
    expect(elapsed).toBeLessThan(20000); // 20 seconds max for 50 items
  });

  it('should generate 384-dimensional vectors', async () => {
    const text = 'Dimension test';
    const embedding = await service.generateEmbedding(text);

    expect(embedding).toHaveLength(384);
    expect(service.getDimensions()).toBe(384);
  });

  it('should return model name', () => {
    const modelName = service.getModelName();
    expect(modelName).toBe('Xenova/all-MiniLM-L6-v2');
  });
});
