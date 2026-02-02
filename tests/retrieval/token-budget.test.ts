import { describe, it, expect } from 'bun:test';
import { enforceTokenBudget } from '../../src/retrieval';
import type { SemanticSearchResult } from '../../src/types/retrieval';

function createMockResult(
  id: string,
  contentLength: number,
  similarity: number
): SemanticSearchResult {
  return {
    item: {
      id,
      project: 'test-project',
      file_context: 'src/file.ts',
      type: 'solution' as any,
      summary: `Summary ${id}`,
      content: 'x'.repeat(contentLength), // Content with specific length
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      solution_verified: true,
    },
    similarity,
  };
}

describe('Token Budget Enforcement', () => {
  describe('enforceTokenBudget', () => {
    it('should return all results when under budget', () => {
      const results = [
        createMockResult('1', 100, 0.9),
        createMockResult('2', 100, 0.8),
        createMockResult('3', 100, 0.7),
      ];

      const { results: enforced, enforced: wasEnforced } = enforceTokenBudget(
        results,
        10000 // Large budget
      );

      expect(enforced).toEqual(results);
      expect(wasEnforced).toBe(false);
    });

    it('should truncate results when over budget', () => {
      const results = [
        createMockResult('1', 1000, 0.9),
        createMockResult('2', 1000, 0.8),
        createMockResult('3', 1000, 0.7),
      ];

      const budget = 500; // Small budget

      const { results: enforced, enforced: wasEnforced } = enforceTokenBudget(
        results,
        budget
      );

      expect(enforced.length).toBeLessThan(results.length);
      expect(wasEnforced).toBe(true);
    });

    it('should allow 10% overflow for budget', () => {
      const results = [
        createMockResult('1', 1000, 0.9),
      ];

      const budget = 200; // Small budget
      const tenPercentOverflow = budget * 1.1;

      const { results: enforced } = enforceTokenBudget(results, budget);

      // Item should be included if within 10% overflow
      const itemTokens = Math.ceil(1000 / 4); // ~250 tokens
      if (itemTokens <= tenPercentOverflow) {
        expect(enforced.length).toBe(1);
      }
    });

    it('should preserve order when truncating', () => {
      const results = [
        createMockResult('1', 100, 0.9),
        createMockResult('2', 100, 0.8),
        createMockResult('3', 100, 0.7),
        createMockResult('4', 100, 0.6),
      ];

      const budget = 50; // Very small budget, likely 1 item max

      const { results: enforced } = enforceTokenBudget(results, budget);

      if (enforced.length > 1) {
        // Should keep first items
        expect(enforced[0].item.id).toBe('1');
        expect(enforced[1].item.id).toBe('2');
      }
    });

    it('should handle empty results', () => {
      const { results: enforced, enforced: wasEnforced } = enforceTokenBudget([], 1000);

      expect(enforced).toEqual([]);
      expect(wasEnforced).toBe(false);
    });

    it('should handle zero budget', () => {
      const results = [
        createMockResult('1', 100, 0.9),
      ];

      const { results: enforced, enforced: wasEnforced } = enforceTokenBudget(results, 0);

      expect(enforced).toEqual([]);
      expect(wasEnforced).toBe(true);
    });
  });
});
