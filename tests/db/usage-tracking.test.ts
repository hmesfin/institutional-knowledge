import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { initializeDb, runMigrations, closeDb } from '../../src/db';
import {
  trackItemAccess,
  getFrequentlyAccessedItems,
  getProjectFingerprint,
  getRecentWins,
  createKnowledgeItem,
} from '../../src/db/operations';

describe('Usage Tracking', () => {
  let db: Database;

  beforeEach(() => {
    // Use in-memory database for tests
    db = initializeDb(':memory:');
    runMigrations(db);
  });

  describe('trackItemAccess', () => {
    it('should increment access_count on first access', () => {
      const item = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test.ts',
        type: 'solution',
        summary: 'Test summary',
        content: 'Test content',
      });

      trackItemAccess(db, item.id);

      const result = db
        .query('SELECT access_count FROM knowledge_items WHERE id = ?')
        .get(item.id) as { access_count: number };

      expect(result.access_count).toBe(1);
    });

    it('should set first_accessed_at on first access', () => {
      const item = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test.ts',
        type: 'solution',
        summary: 'Test summary',
        content: 'Test content',
      });

      trackItemAccess(db, item.id);

      const result = db
        .query('SELECT first_accessed_at FROM knowledge_items WHERE id = ?')
        .get(item.id) as { first_accessed_at: string | null };

      expect(result.first_accessed_at).not.toBeNull();
      expect(result.first_accessed_at).toBeTruthy();
    });

    it('should increment access_count on subsequent accesses', () => {
      const item = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test.ts',
        type: 'solution',
        summary: 'Test summary',
        content: 'Test content',
      });

      trackItemAccess(db, item.id);
      trackItemAccess(db, item.id);
      trackItemAccess(db, item.id);

      const result = db
        .query('SELECT access_count FROM knowledge_items WHERE id = ?')
        .get(item.id) as { access_count: number };

      expect(result.access_count).toBe(3);
    });

    it('should update last_accessed_at on each access', () => {
      const item = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test.ts',
        type: 'solution',
        summary: 'Test summary',
        content: 'Test content',
      });

      trackItemAccess(db, item.id);

      const firstResult = db
        .query('SELECT last_accessed_at FROM knowledge_items WHERE id = ?')
        .get(item.id) as { last_accessed_at: string };

      // Small delay to ensure timestamp changes
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }

      trackItemAccess(db, item.id);

      const secondResult = db
        .query('SELECT last_accessed_at FROM knowledge_items WHERE id = ?')
        .get(item.id) as { last_accessed_at: string };

      expect(secondResult.last_accessed_at).not.toBe(firstResult.last_accessed_at);
    });

    it('should not change first_accessed_at after first access', () => {
      const item = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test.ts',
        type: 'solution',
        summary: 'Test summary',
        content: 'Test content',
      });

      trackItemAccess(db, item.id);

      const firstResult = db
        .query('SELECT first_accessed_at FROM knowledge_items WHERE id = ?')
        .get(item.id) as { first_accessed_at: string };

      trackItemAccess(db, item.id);

      const secondResult = db
        .query('SELECT first_accessed_at FROM knowledge_items WHERE id = ?')
        .get(item.id) as { first_accessed_at: string };

      expect(secondResult.first_accessed_at).toBe(firstResult.first_accessed_at);
    });

    it('should handle non-existent item gracefully', () => {
      // Should not throw error
      trackItemAccess(db, 'non-existent-id');
    });
  });

  describe('getFrequentlyAccessedItems', () => {
    beforeEach(() => {
      // Create test items with different access patterns
      const item1 = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test1.ts',
        type: 'solution',
        summary: 'Item 1',
        content: 'Content 1',
      });

      const item2 = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test2.ts',
        type: 'pattern',
        summary: 'Item 2',
        content: 'Content 2',
      });

      const item3 = createKnowledgeItem(db, {
        project: 'other-project',
        file_context: 'src/test3.ts',
        type: 'solution',
        summary: 'Item 3',
        content: 'Content 3',
      });

      // Track accesses
      for (let i = 0; i < 10; i++) {
        trackItemAccess(db, item1.id);
      }
      for (let i = 0; i < 5; i++) {
        trackItemAccess(db, item2.id);
      }
      for (let i = 0; i < 3; i++) {
        trackItemAccess(db, item3.id);
      }
    });

    it('should return items sorted by access count', () => {
      const items = getFrequentlyAccessedItems(db, { limit: 10 });

      expect(items.length).toBe(3);
      expect(items[0].summary).toBe('Item 1'); // 10 accesses
      expect(items[1].summary).toBe('Item 2'); // 5 accesses
      expect(items[2].summary).toBe('Item 3'); // 3 accesses
    });

    it('should filter by project', () => {
      const items = getFrequentlyAccessedItems(db, {
        project: 'test-project',
      });

      expect(items.length).toBe(2);
      expect(items[0].summary).toBe('Item 1');
      expect(items[1].summary).toBe('Item 2');
    });

    it('should filter by type', () => {
      const items = getFrequentlyAccessedItems(db, {
        type: 'solution',
      });

      expect(items.length).toBe(2);
      expect(items[0].summary).toBe('Item 1');
      expect(items[1].summary).toBe('Item 3');
    });

    it('should respect minAccessCount filter', () => {
      const items = getFrequentlyAccessedItems(db, {
        minAccessCount: 5,
      });

      expect(items.length).toBe(2); // Only items with 5+ accesses
    });

    it('should respect limit parameter', () => {
      const items = getFrequentlyAccessedItems(db, {
        limit: 2,
      });

      expect(items.length).toBe(2);
    });
  });

  describe('getProjectFingerprint', () => {
    beforeEach(() => {
      // Create test items
      createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test1.ts',
        type: 'solution',
        summary: 'Solution 1',
        content: 'Content 1',
      });

      createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test2.ts',
        type: 'pattern',
        summary: 'Pattern 1',
        content: 'Content 2',
      });

      createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test3.ts',
        type: 'solution',
        summary: 'Solution 2',
        content: 'Content 3',
      });

      createKnowledgeItem(db, {
        project: 'other-project',
        file_context: 'src/test4.ts',
        type: 'gotcha',
        summary: 'Gotcha 1',
        content: 'Content 4',
      });
    });

    it('should return global statistics when no project specified', () => {
      const fingerprint = getProjectFingerprint(db);

      expect(fingerprint.project).toBeUndefined();
      expect(fingerprint.total_items).toBe(4);
      expect(fingerprint.type_counts.solution).toBe(2);
      expect(fingerprint.type_counts.pattern).toBe(1);
      expect(fingerprint.type_counts.gotcha).toBe(1);
    });

    it('should return project-specific statistics', () => {
      const fingerprint = getProjectFingerprint(db, 'test-project');

      expect(fingerprint.project).toBe('test-project');
      expect(fingerprint.total_items).toBe(3);
      expect(fingerprint.type_counts.solution).toBe(2);
      expect(fingerprint.type_counts.pattern).toBe(1);
      expect(fingerprint.type_counts.gotcha).toBeUndefined();
    });

    it('should include most accessed items', () => {
      const item1 = createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test.ts',
        type: 'solution',
        summary: 'Popular Item',
        content: 'Content',
      });

      // Make this item popular
      for (let i = 0; i < 5; i++) {
        trackItemAccess(db, item1.id);
      }

      const fingerprint = getProjectFingerprint(db, 'test-project');

      expect(fingerprint.most_accessed.length).toBeGreaterThan(0);
      expect(fingerprint.most_accessed[0].id).toBe(item1.id);
      expect(fingerprint.most_accessed[0].access_count).toBe(5);
    });

    it('should include recently created items', () => {
      const fingerprint = getProjectFingerprint(db, 'test-project');

      expect(fingerprint.recently_created.length).toBeGreaterThan(0);
      expect(fingerprint.recently_created.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getRecentWins', () => {
    beforeEach(() => {
      // Create some wins and other items
      createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test1.ts',
        type: 'win',
        summary: 'Recent Win',
        content: 'Content 1',
      });

      createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test2.ts',
        type: 'win',
        summary: 'Older Win',
        content: 'Content 2',
      });

      createKnowledgeItem(db, {
        project: 'test-project',
        file_context: 'src/test3.ts',
        type: 'solution',
        summary: 'Not a win',
        content: 'Content 3',
      });
    });

    it('should return only win type items', () => {
      const wins = getRecentWins(db, 'test-project');

      expect(wins.length).toBe(2);
      expect(wins.every((w) => w.type === 'win')).toBe(true);
    });

    it('should return items sorted by creation date', () => {
      const wins = getRecentWins(db, 'test-project');

      // Most recent first
      expect(wins[0].summary).toBe('Recent Win');
      expect(wins[1].summary).toBe('Older Win');
    });

    it('should respect limit parameter', () => {
      const wins = getRecentWins(db, 'test-project', 1);

      expect(wins.length).toBe(1);
    });

    it('should return all wins when no project specified', () => {
      const wins = getRecentWins(db);

      expect(wins.length).toBe(2);
    });

    it('should return empty array when no wins exist', () => {
      const wins = getRecentWins(db, 'non-existent-project');

      expect(wins).toEqual([]);
    });
  });
});
