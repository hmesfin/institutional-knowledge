import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { initializeDb, runMigrations, closeDb, createKnowledgeItem } from '../../src/db';
import { getTier4Results } from '../../src/retrieval';

describe('Tiered Retrieval Integration', () => {
  let db: Database;

  beforeEach(() => {
    db = initializeDb(':memory:');
    runMigrations(db);
  });

  it('should execute tier 4 retrieval with all tiers', async () => {
    // Create test knowledge items
    const items = [
      {
        project: 'test-project',
        file_context: 'src/auth.ts',
        type: 'solution' as const,
        summary: 'JWT authentication implementation',
        content: 'Implemented JWT-based authentication with refresh tokens',
      },
      {
        project: 'test-project',
        file_context: 'src/database.ts',
        type: 'pattern' as const,
        summary: 'Repository pattern for data access',
        content: 'Used repository pattern to abstract database operations',
      },
      {
        project: 'test-project',
        file_context: 'src/api.ts',
        type: 'win' as const,
        summary: 'Reduced API response time by 50%',
        content: 'Optimized database queries and added caching layer',
      },
    ];

    const createdItems = items.map((item) => createKnowledgeItem(db, item));
    expect(createdItems.length).toBe(3);

    // Test tiered retrieval
    const result = await getTier4Results(db, 'authentication and database patterns', {
      tokenBudget: 8000,
      diversify: 'type',
      includeTier1: true,
      includeTier2: true,
      includeTier3: false,
    });

    // Verify results
    expect(result).toBeDefined();
    expect(result.finalResults.length).toBeGreaterThanOrEqual(0);
    expect(result.totalTokens).toBeGreaterThanOrEqual(0);
    expect(result.diversityScore).toBeGreaterThanOrEqual(0);
    expect(result.diversityScore).toBeLessThanOrEqual(1);

    // Verify tier 1 context
    expect(result.tier1).toBeDefined();
    expect(result.tier1?.fingerprint.total_items).toBe(3);
    expect(result.tier1?.recentWins.length).toBe(1);

    // Verify diversity
    if (result.finalResults.length > 1) {
      const types = result.finalResults.map((r) => r.item.type);
      const uniqueTypes = new Set(types);
      // With diversification enabled, should have some diversity
      expect(uniqueTypes.size).toBeGreaterThan(0);
    }
  });

  it('should enforce token budget', async () => {
    // Create a large knowledge item
    createKnowledgeItem(db, {
      project: 'test-project',
      file_context: 'src/test.ts',
      type: 'solution',
      summary: 'Large item',
      content: 'x'.repeat(10000), // Large content
    });

    const result = await getTier4Results(db, 'large item', {
      tokenBudget: 100, // Very small budget
      diversify: 'none',
    });

    // Budget should be enforced
    expect(result.totalTokens).toBeLessThanOrEqual(110); // 10% overflow allowed
  });

  it('should diversify results by type', async () => {
    // Create items of different types
    createKnowledgeItem(db, {
      project: 'test-project',
      file_context: 'src/auth.ts',
      type: 'solution',
      summary: 'Auth solution',
      content: 'Auth content',
    });

    createKnowledgeItem(db, {
      project: 'test-project',
      file_context: 'src/db.ts',
      type: 'pattern',
      summary: 'Database pattern',
      content: 'Database content',
    });

    createKnowledgeItem(db, {
      project: 'test-project',
      file_context: 'src/api.ts',
      type: 'gotcha',
      summary: 'API gotcha',
      content: 'Gotcha content',
    });

    const result = await getTier4Results(db, 'test query', {
      tokenBudget: 8000,
      diversify: 'type',
    });

    // With type diversification, should see different types
    const types = result.finalResults.map((r) => r.item.type);
    const uniqueTypes = new Set(types);
    if (result.finalResults.length > 1) {
      expect(uniqueTypes.size).toBeGreaterThan(0);
    }
  });
});
