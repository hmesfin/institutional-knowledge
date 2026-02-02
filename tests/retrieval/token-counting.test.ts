import { describe, it, expect } from 'bun:test';
import {
  estimateTokens,
  countItemTokens,
} from '../../src/types/retrieval';
import type { KnowledgeItem } from '../../src/types/knowledge-item';

describe('Token Counting Utilities', () => {
  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(estimateTokens(undefined as any)).toBe(0);
    });

    it('should estimate tokens for short text', () => {
      // "Hello world" is 11 characters, should be ~3 tokens
      expect(estimateTokens('Hello world')).toBe(3);
    });

    it('should estimate tokens for longer text', () => {
      // 100 characters should be ~25 tokens
      const text = 'a'.repeat(100);
      expect(estimateTokens(text)).toBe(25);
    });

    it('should round up partial tokens', () => {
      // 5 characters = 1.25 tokens, should round to 2
      expect(estimateTokens('Hello')).toBe(2);
    });
  });

  describe('countItemTokens', () => {
    const mockItem: KnowledgeItem = {
      id: 'test-id',
      project: 'test-project',
      file_context: 'src/file.ts',
      type: 'solution',
      summary: 'A brief summary of the solution',
      content: 'This is the detailed content of the knowledge item. It contains multiple sentences.',
      decision_rationale: 'This approach was chosen for performance',
      alternatives_considered: ['Alternative 1', 'Alternative 2'],
      solution_verified: true,
      tags: ['tag1', 'tag2', 'tag3'],
      related_issues: ['issue-1', 'issue-2'],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    it('should count tokens in all fields', () => {
      const tokens = countItemTokens(mockItem);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', () => {
      const minimalItem: KnowledgeItem = {
        ...mockItem,
        decision_rationale: undefined,
        alternatives_considered: undefined,
        tags: undefined,
        related_issues: undefined,
      };
      const tokens = countItemTokens(minimalItem);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should count more tokens for longer content', () => {
      const shortItem: KnowledgeItem = {
        ...mockItem,
        content: 'Short',
      };
      const longItem: KnowledgeItem = {
        ...mockItem,
        content: 'This is a much longer content string that should result in significantly more tokens being counted.',
      };

      expect(countItemTokens(longItem)).toBeGreaterThan(countItemTokens(shortItem));
    });
  });
});
