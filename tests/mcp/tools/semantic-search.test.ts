import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { initializeDb, runMigrations, closeDb } from '../../../src/db/schema';
import type Database from 'bun:sqlite';
import { semantic_search_tool, generate_embeddings_tool } from '../../../src/mcp/tools';
import type { SemanticSearchInput, GenerateEmbeddingsInput } from '../../../src/mcp/tools';

describe('Semantic Search MCP Tools', () => {
  let db: Database;

  beforeAll(() => {
    db = initializeDb(':memory:');
    runMigrations(db);
  });

  afterEach(() => {
    // Clean up database after each test
    db.exec('DELETE FROM knowledge_items');
  });

  describe('semantic_search_tool', () => {
    it('should return error when no embeddings exist', async () => {
      const input: SemanticSearchInput = {
        query: 'authentication error',
        limit: 10,
        threshold: 0.5,
      };

      const result = await semantic_search_tool.execute(input, { db });

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.message).toContain('No items with embeddings found');
    });

    it('should filter by project when specified', async () => {
      // Create two knowledge items
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run('item-1', 'project-a', 'src/auth.ts', 'solution', 'Fix JWT auth error', 'Content here');
      stmt.run('item-2', 'project-b', 'src/api.ts', 'pattern', 'API design pattern', 'Content here');

      // Generate embeddings
      const genInput: GenerateEmbeddingsInput = { limit: 10 };
      await generate_embeddings_tool.execute(genInput, { db });

      // Search with project filter
      const searchInput: SemanticSearchInput = {
        query: 'authentication',
        project: 'project-a',
        limit: 10,
      };

      const result = await semantic_search_tool.execute(searchInput, { db });

      expect(result.success).toBe(true);
      // All results should be from project-a
      if (result.results && result.results.length > 0) {
        for (const r of result.results) {
          expect(r.item.project).toBe('project-a');
        }
      }
    });

    it('should filter by type when specified', async () => {
      // Create knowledge items of different types
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run('item-1', 'project', 'src/auth.ts', 'solution', 'Fix JWT auth error', 'Content here');
      stmt.run('item-2', 'project', 'src/api.ts', 'pattern', 'API design pattern', 'Content here');

      // Generate embeddings
      const genInput: GenerateEmbeddingsInput = { limit: 10 };
      await generate_embeddings_tool.execute(genInput, { db });

      // Search with type filter
      const searchInput: SemanticSearchInput = {
        query: 'API',
        type: 'pattern',
        limit: 10,
      };

      const result = await semantic_search_tool.execute(searchInput, { db });

      expect(result.success).toBe(true);
      // All results should be of type 'pattern'
      if (result.results && result.results.length > 0) {
        for (const r of result.results) {
          expect(r.item.type).toBe('pattern');
        }
      }
    });

    it('should respect limit parameter', async () => {
      // Create 5 knowledge items
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      for (let i = 1; i <= 5; i++) {
        stmt.run(`item-${i}`, 'project', `src/file${i}.ts`, 'solution', `Solution ${i}`, 'Content');
      }

      // Generate embeddings
      const genInput: GenerateEmbeddingsInput = { limit: 10 };
      await generate_embeddings_tool.execute(genInput, { db });

      // Search with limit
      const searchInput: SemanticSearchInput = {
        query: 'solution',
        limit: 2,
      };

      const result = await semantic_search_tool.execute(searchInput, { db });

      expect(result.success).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should respect threshold parameter', async () => {
      // Create knowledge items
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run('item-1', 'project', 'src/auth.ts', 'solution', 'Fix JWT auth error', 'Content about authentication');
      stmt.run('item-2', 'project', 'src/cooking.ts', 'pattern', 'Baking cookies', 'Recipe for cookies');

      // Generate embeddings
      const genInput: GenerateEmbeddingsInput = { limit: 10 };
      await generate_embeddings_tool.execute(genInput, { db });

      // Search with high threshold - should only return very similar items
      const searchInput: SemanticSearchInput = {
        query: 'authentication login error',
        limit: 10,
        threshold: 0.8,
      };

      const result = await semantic_search_tool.execute(searchInput, { db });

      expect(result.success).toBe(true);

      // All results should have similarity >= 0.8
      if (result.results && result.results.length > 0) {
        for (const r of result.results) {
          expect(r.similarity).toBeGreaterThanOrEqual(0.8);
        }
      }
    });
  });

  describe('generate_embeddings_tool', () => {
    it('should generate embeddings for items without them', async () => {
      // Create knowledge items
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run('item-1', 'project', 'src/auth.ts', 'solution', 'Fix JWT auth error', 'Content');

      const input: GenerateEmbeddingsInput = { limit: 10 };
      const result = await generate_embeddings_tool.execute(input, { db });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);

      // Verify embedding was stored
      const row = db.query('SELECT embedding FROM knowledge_items WHERE id = ?').get('item-1') as any;
      expect(row.embedding).toBeTruthy();
      expect(JSON.parse(row.embedding)).toBeInstanceOf(Array);
    });

    it('should return message when all items already have embeddings', async () => {
      // Create item with embedding
      const embedding = JSON.stringify(Array(384).fill(0));
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, embedding, embedding_model, embedding_generated_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run('item-1', 'project', 'src/auth.ts', 'solution', 'Fix JWT auth error', 'Content', embedding, 'Xenova/all-MiniLM-L6-v2', new Date().toISOString());

      const input: GenerateEmbeddingsInput = { limit: 10 };
      const result = await generate_embeddings_tool.execute(input, { db });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.message).toContain('All items already have embeddings');
    });

    it('should respect limit parameter', async () => {
      // Create 10 knowledge items
      const stmt = db.query(`
        INSERT INTO knowledge_items (id, project, file_context, type, summary, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      for (let i = 1; i <= 10; i++) {
        stmt.run(`item-${i}`, 'project', `src/file${i}.ts`, 'solution', `Solution ${i}`, 'Content');
      }

      const input: GenerateEmbeddingsInput = { limit: 5 };
      const result = await generate_embeddings_tool.execute(input, { db });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(5);
    });

    it('should handle empty database', async () => {
      const input: GenerateEmbeddingsInput = { limit: 10 };
      const result = await generate_embeddings_tool.execute(input, { db });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.message).toContain('All items already have embeddings');
    });
  });
});
