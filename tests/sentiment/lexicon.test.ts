import { describe, it, expect } from 'bun:test';
import {
  isPositiveWord,
  isNegativeWord,
  getIntensifier,
  isProblemIndicator,
  isSolutionIndicator,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
} from '../../src/sentiment/lexicon';

describe('Sentiment Lexicon', () => {
  describe('Positive Words', () => {
    it('should detect positive words', () => {
      expect(isPositiveWord('success')).toBe(true);
      expect(isPositiveWord('works')).toBe(true);
      expect(isPositiveWord('finally')).toBe(true);
      expect(isPositiveWord('great')).toBe(true);
    });

    it('should not detect negative words as positive', () => {
      expect(isPositiveWord('problem')).toBe(false);
      expect(isPositiveWord('bug')).toBe(false);
      expect(isPositiveWord('frustrated')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isPositiveWord('SUCCESS')).toBe(true);
      expect(isPositiveWord('Works')).toBe(true);
      expect(isPositiveWord('FiNaLlY')).toBe(true);
    });

    it('should contain comprehensive positive vocabulary', () => {
      expect(POSITIVE_WORDS.size).toBeGreaterThan(50);

      // Should have success-related words
      expect(POSITIVE_WORDS.has('success')).toBe(true);
      expect(POSITIVE_WORDS.has('solution')).toBe(true);
      expect(POSITIVE_WORDS.has('fixed')).toBe(true);

      // Should have emotion words
      expect(POSITIVE_WORDS.has('happy')).toBe(true);
      expect(POSITIVE_WORDS.has('excited')).toBe(true);
      expect(POSITIVE_WORDS.has('relieved')).toBe(true);
    });
  });

  describe('Negative Words', () => {
    it('should detect negative words', () => {
      expect(isNegativeWord('problem')).toBe(true);
      expect(isNegativeWord('bug')).toBe(true);
      expect(isNegativeWord('frustrated')).toBe(true);
      expect(isNegativeWord('stuck')).toBe(true);
    });

    it('should not detect positive words as negative', () => {
      expect(isNegativeWord('success')).toBe(false);
      expect(isNegativeWord('works')).toBe(false);
      expect(isNegativeWord('great')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isNegativeWord('PROBLEM')).toBe(true);
      expect(isNegativeWord('Bug')).toBe(true);
      expect(isNegativeWord('StuCk')).toBe(true);
    });

    it('should contain comprehensive negative vocabulary', () => {
      expect(NEGATIVE_WORDS.size).toBeGreaterThan(50);

      // Should have problem-related words
      expect(NEGATIVE_WORDS.has('problem')).toBe(true);
      expect(NEGATIVE_WORDS.has('error')).toBe(true);
      expect(NEGATIVE_WORDS.has('broken')).toBe(true);

      // Should have emotion words
      expect(NEGATIVE_WORDS.has('angry')).toBe(true);
      expect(NEGATIVE_WORDS.has('frustrated')).toBe(true);
      expect(NEGATIVE_WORDS.has('stressed')).toBe(true);
    });
  });

  describe('Intensifiers', () => {
    it('should detect positive intensifiers', () => {
      expect(getIntensifier('very')).toBeGreaterThan(1);
      expect(getIntensifier('really')).toBeGreaterThan(1);
      expect(getIntensifier('extremely')).toBeGreaterThan(1);
    });

    it('should detect negative intensifiers (negators)', () => {
      expect(getIntensifier('not')).toBeLessThan(0);
      expect(getIntensifier('never')).toBeLessThan(0);
      expect(getIntensifier('no')).toBeLessThan(0);
    });

    it('should return 1.0 for non-intensifiers', () => {
      expect(getIntensifier('random')).toBe(1.0);
      expect(getIntensifier('word')).toBe(1.0);
    });

    it('should be case-insensitive', () => {
      expect(getIntensifier('VERY')).toBe(1.5);
      expect(getIntensifier('Not')).toBe(-1.0);
    });

    it('should handle phrases', () => {
      expect(getIntensifier('kind of')).toBeLessThan(1);
      expect(getIntensifier('a bit')).toBeLessThan(1);
    });
  });

  describe('Problem Indicators', () => {
    it('should detect problem indicators', () => {
      expect(isProblemIndicator('bug')).toBe(true);
      expect(isProblemIndicator('error')).toBe(true);
      expect(isProblemIndicator('stuck')).toBe(true);
      expect(isProblemIndicator('confused')).toBe(true);
    });

    it('should not detect non-problem indicators', () => {
      expect(isProblemIndicator('works')).toBe(false);
      expect(isProblemIndicator('solution')).toBe(false);
      expect(isProblemIndicator('happy')).toBe(false);
    });
  });

  describe('Solution Indicators', () => {
    it('should detect solution indicators', () => {
      expect(isSolutionIndicator('fix')).toBe(true);
      expect(isSolutionIndicator('solution')).toBe(true);
      expect(isSolutionIndicator('works')).toBe(true);
      expect(isSolutionIndicator('finally')).toBe(true);
    });

    it('should not detect non-solution indicators', () => {
      expect(isSolutionIndicator('problem')).toBe(false);
      expect(isSolutionIndicator('bug')).toBe(false);
      expect(isSolutionIndicator('frustrated')).toBe(false);
    });
  });
});
