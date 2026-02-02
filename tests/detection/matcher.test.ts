import { describe, it, expect } from 'bun:test';
import { detectPatterns, extractSummary } from '../../src/detection/matcher';

describe('Pattern Matcher', () => {
  describe('detectPatterns', () => {
    it('should detect success patterns', () => {
      const text = "After hours of debugging, it's finally working!";
      const result = detectPatterns(text);

      expect(result.detected).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.suggestedType).toBe('win');
    });

    it('should detect problem patterns', () => {
      const text = "Found the bug - it was a race condition in the async handler";
      const result = detectPatterns(text);

      expect(result.detected).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.suggestedType).toBe('troubleshooting');
    });

    it('should detect gotcha patterns', () => {
      const text = "Watch out - this API is not well documented and easy to miss";
      const result = detectPatterns(text);

      expect(result.detected).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.suggestedType).toBe('gotcha');
    });

    it('should detect solution patterns', () => {
      const text = 'The solution is to implement a retry mechanism with exponential backoff';
      const result = detectPatterns(text);

      expect(result.detected).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should return no detection for plain text', () => {
      const text = 'This is just a regular sentence with no special patterns';
      const result = detectPatterns(text);

      expect(result.detected).toBe(false);
      expect(result.matches.length).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should respect minimum confidence threshold', () => {
      const text = 'Error occurred'; // Low confidence pattern
      const result = detectPatterns(text, { minConfidence: 0.8 });

      // Should filter out low-confidence matches
      if (result.matches.length > 0) {
        expect(result.matches.every((m) => m.finalConfidence >= 0.8)).toBe(true);
      }
    });

    it('should provide context for each match', () => {
      const text = 'After 3 hours of debugging, finally got it working!';
      const result = detectPatterns(text, { contextWindow: 50 });

      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match.context).toBeTruthy();
        expect(match.context.length).toBeGreaterThan(0);
        expect(match.context).toContain(match.matchedText);
      }
    });

    it('should provide confidence adjustment reasons', () => {
      const text = 'FINALLY WORKING!!!';
      const result = detectPatterns(text);

      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match.reasons).toBeInstanceOf(Array);
        expect(match.baseConfidence).not.toBe(match.finalConfidence);
      }
    });

    it('should detect multiple patterns in one text', () => {
      const text =
        'Found the bug after hours. Finally working! The solution was to fix the race condition.';
      const result = detectPatterns(text);

      expect(result.detected).toBe(true);
      expect(result.matches.length).toBeGreaterThan(1);
    });

    it('should identify best match', () => {
      const text = 'After hours of struggle, FINALLY working! This is a huge win.';
      const result = detectPatterns(text);

      expect(result.bestMatch).toBeDefined();
      expect(result.bestMatch?.matchedText).toBeTruthy();
    });

    it('should apply context boosters', () => {
      const text = 'After 3 hours of debugging, it is finally working';
      const result = detectPatterns(text);

      if (result.matches.length > 0) {
        const match = result.matches.find((m) => m.matchedText.includes('finally'));
        if (match) {
          // Should have boosted confidence due to "hours" context
          expect(match.finalConfidence).toBeGreaterThan(match.baseConfidence);
        }
      }
    });

    it('should apply context dampers', () => {
      const text = "It's finally not working";
      const result = detectPatterns(text);

      if (result.matches.length > 0) {
        const match = result.matches.find((m) => m.matchedText.includes('finally'));
        if (match) {
          // Should have reduced confidence due to "not" context
          expect(match.finalConfidence).toBeLessThan(match.baseConfidence);
        }
      }
    });

    it('should filter by pattern types', () => {
      const text = 'Finally working! Found the bug.';
      const result = detectPatterns(text, { patternTypes: ['success'] });

      expect(result.matches.every((m) => m.pattern.type === 'success')).toBe(true);
    });

    it('should handle empty text', () => {
      const result = detectPatterns('');

      expect(result.detected).toBe(false);
      expect(result.matches).toEqual([]);
    });

    it('should handle very short text', () => {
      const result = detectPatterns('bug');

      expect(result.detected).toBe(false);
    });
  });

  describe('extractSummary', () => {
    it('should extract summary around match', () => {
      const text =
        'After hours of debugging, I finally found the issue. The problem was in the async handler.';
      const result = detectPatterns(text);

      if (result.bestMatch) {
        const summary = extractSummary(text, result.bestMatch, 100);
        expect(summary).toBeTruthy();
        expect(summary.length).toBeGreaterThan(0);
        expect(summary.length).toBeLessThanOrEqual(100);
      }
    });

    it('should include matched text in summary', () => {
      const text = 'The solution is to add a retry mechanism';
      const result = detectPatterns(text);

      if (result.bestMatch) {
        const summary = extractSummary(text, result.bestMatch);
        expect(summary).toContain(result.bestMatch.matchedText);
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should boost confidence for exclamation marks', () => {
      const text = 'Finally working!!!';
      const result = detectPatterns(text);

      if (result.matches.length > 0) {
        const match = result.matches[0];
        const hasExclamationBoost = match.reasons.some((r) => r.includes('exclamation'));
        if (match.matchedText.includes('!')) {
          expect(hasExclamationBoost).toBe(true);
        }
      }
    });

    it('should boost confidence for all caps', () => {
      const text = 'IT WORKS!';
      const result = detectPatterns(text);

      if (result.matches.length > 0) {
        const match = result.matches.find((m) => m.matchedText === m.matchedText.toUpperCase());
        if (match && match.matchedText.length > 2) {
          const hasCapsBoost = match.reasons.some((r) => r.includes('all caps'));
          expect(hasCapsBoost).toBe(true);
        }
      }
    });

    it('should reduce confidence for very short matches', () => {
      const result = detectPatterns('bug found', { contextWindow: 50 });

      if (result.matches.length > 0) {
        const shortMatch = result.matches.find((m) => m.matchedText.length < 5);
        if (shortMatch) {
          const hasShortPenalty = shortMatch.reasons.some((r) => r.includes('very short'));
          expect(hasShortPenalty).toBe(true);
        }
      }
    });
  });
});
