import { describe, it, expect } from 'bun:test';
import {
  SUCCESS_PATTERNS,
  PROBLEM_PATTERNS,
  SOLUTION_PATTERNS,
  GOTCHA_PATTERNS,
  ALL_PATTERNS,
  getPatternsByType,
  getPatternById,
} from '../../src/detection/patterns';

describe('Pattern Definitions', () => {
  describe('Pattern Structure', () => {
    it('should have all required fields', () => {
      for (const pattern of ALL_PATTERNS) {
        expect(pattern.id).toBeTruthy();
        expect(pattern.type).toBeTruthy();
        expect(pattern.regex).toBeInstanceOf(RegExp);
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
        expect(pattern.suggestedType).toBeTruthy();
      }
    });

    it('should have unique pattern IDs', () => {
      const ids = ALL_PATTERNS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Success Patterns', () => {
    it('should have success type', () => {
      for (const pattern of SUCCESS_PATTERNS) {
        expect(pattern.type).toBe('success');
      }
    });

    it('should detect "finally working" pattern', () => {
      const pattern = SUCCESS_PATTERNS.find((p) => p.id === 'finally-working');
      expect(pattern).toBeDefined();

      const text = "After 3 hours, it's finally working!";
      expect(pattern.regex.test(text)).toBe(true);
    });

    it('should detect performance wins', () => {
      const pattern = SUCCESS_PATTERNS.find((p) => p.id === 'performance-win');
      expect(pattern).toBeDefined();

      const text = 'reduced by 80%';
      expect(pattern.regex.test(text)).toBe(true);
    });
  });

  describe('Problem Patterns', () => {
    it('should have problem type', () => {
      for (const pattern of PROBLEM_PATTERNS) {
        expect(pattern.type).toBe('problem');
      }
    });

    it('should detect "bug found" pattern', () => {
      const pattern = PROBLEM_PATTERNS.find((p) => p.id === 'bug-found');
      expect(pattern).toBeDefined();

      const text = 'Found the bug - it was a missing null check';
      expect(pattern.regex.test(text)).toBe(true);
    });

    it('should detect edge cases', () => {
      const pattern = PROBLEM_PATTERNS.find((p) => p.id === 'edge-case');
      expect(pattern).toBeDefined();

      const text = 'This is a race condition that only happens sometimes';
      expect(pattern.regex.test(text)).toBe(true);
    });
  });

  describe('Solution Patterns', () => {
    it('should have solution type', () => {
      for (const pattern of SOLUTION_PATTERNS) {
        expect(pattern.type).toBe('solution');
      }
    });

    it('should detect solution statements', () => {
      const pattern = SOLUTION_PATTERNS.find((p) => p.id === 'solution-statement');
      expect(pattern).toBeDefined();

      const text = 'The solution is to add a retry mechanism';
      expect(pattern.regex.test(text)).toBe(true);
    });
  });

  describe('Gotcha Patterns', () => {
    it('should have gotcha type', () => {
      for (const pattern of GOTCHA_PATTERNS) {
        expect(pattern.type).toBe('gotcha');
      }
    });

    it('should detect warnings', () => {
      const pattern = GOTCHA_PATTERNS.find((p) => p.id === 'warning');
      expect(pattern).toBeDefined();

      const text = 'Watch out for the off-by-one error here';
      expect(pattern.regex.test(text)).toBe(true);
    });

    it('should detect lessons learned', () => {
      const pattern = GOTCHA_PATTERNS.find((p) => p.id === 'lesson-learned');
      expect(pattern).toBeDefined();

      const text = 'Learned the hard way that async/await is not the same as Promise';
      expect(pattern.regex.test(text)).toBe(true);
    });
  });

  describe('Pattern Lookup', () => {
    it('should get patterns by type', () => {
      const successPatterns = getPatternsByType('success');
      expect(successPatterns.length).toBe(SUCCESS_PATTERNS.length);
      expect(successPatterns.every((p) => p.type === 'success')).toBe(true);
    });

    it('should get pattern by ID', () => {
      const pattern = getPatternById('finally-working');
      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('finally-working');
    });

    it('should return undefined for non-existent pattern', () => {
      const pattern = getPatternById('non-existent');
      expect(pattern).toBeUndefined();
    });
  });
});
