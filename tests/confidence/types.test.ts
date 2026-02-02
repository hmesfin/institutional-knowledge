import { describe, it, expect } from 'bun:test';
import {
  getConfidenceLevel,
  calculateTextLengthScore,
  calculateStructureScore,
  createFactor,
  DEFAULT_WEIGHTS,
  THRESHOLD_PRESETS,
} from '../../src/confidence/types';

describe('Confidence Types', () => {
  describe('getConfidenceLevel', () => {
    it('should classify very high confidence', () => {
      const level = getConfidenceLevel(0.95, THRESHOLD_PRESETS.conservative);
      expect(level).toBe('very-high');
    });

    it('should classify high confidence', () => {
      const level = getConfidenceLevel(0.8, THRESHOLD_PRESETS.conservative);
      expect(level).toBe('high');
    });

    it('should classify medium confidence', () => {
      const level = getConfidenceLevel(0.6, THRESHOLD_PRESETS.conservative);
      expect(level).toBe('medium');
    });

    it('should classify low confidence', () => {
      const level = getConfidenceLevel(0.4, THRESHOLD_PRESETS.conservative);
      expect(level).toBe('low');
    });

    it('should classify very low confidence', () => {
      const level = getConfidenceLevel(0.1, THRESHOLD_PRESETS.conservative);
      expect(level).toBe('very-low');
    });

    it('should respect different threshold presets', () => {
      const conservativeLevel = getConfidenceLevel(0.75, THRESHOLD_PRESETS.conservative);
      const aggressiveLevel = getConfidenceLevel(0.75, THRESHOLD_PRESETS.aggressive);

      expect(conservativeLevel).not.toBe(aggressiveLevel);
    });
  });

  describe('calculateTextLengthScore', () => {
    it('should penalize very short text', () => {
      const { score, explanation } = calculateTextLengthScore('Short', 50);
      expect(score).toBeLessThan(0.5);
      expect(explanation).toContain('too short');
    });

    it('should give full score for optimal length', () => {
      const optimalLength = 'a'.repeat(250);
      const { score, explanation } = calculateTextLengthScore(optimalLength, 50, [100, 500]);
      expect(score).toBe(1.0);
      expect(explanation).toContain('optimal');
    });

    it('should give partial score for slightly short text', () => {
      const shortText = 'a'.repeat(75);
      const { score } = calculateTextLengthScore(shortText, 50, [100, 500]);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1.0);
    });

    it('should penalize very long text', () => {
      const longText = 'a'.repeat(1000);
      const { score, explanation } = calculateTextLengthScore(longText, 50, [100, 500]);
      expect(score).toBeLessThan(1.0);
      expect(explanation).toContain('long');
    });
  });

  describe('calculateStructureScore', () => {
    it('should score highly for patterns and transitions', () => {
      const { score, explanation } = calculateStructureScore(true, true, true, false);
      expect(score).toBeGreaterThan(0.7);
      expect(explanation).toContain('knowledge pattern');
      expect(explanation).toContain('transition');
    });

    it('should score low for no structure', () => {
      const { score, explanation } = calculateStructureScore(false, false, false, false);
      expect(score).toBe(0);
    });

    it('should penalize questions', () => {
      const { score: scoreWithQ } = calculateStructureScore(true, true, true, true);
      const { score: scoreWithoutQ } = calculateStructureScore(true, true, true, false);
      expect(scoreWithQ).toBeLessThan(scoreWithoutQ);
    });

    it('should reward multiple sentences', () => {
      const { score: single } = calculateStructureScore(false, false, false, false);
      const { score: multi } = calculateStructureScore(false, false, true, false);
      expect(multi).toBeGreaterThan(single);
    });
  });

  describe('createFactor', () => {
    it('should create a factor with correct contribution', () => {
      const factor = createFactor('test', 'Test Factor', 0.5, 0.8, 'Test explanation');
      expect(factor.id).toBe('test');
      expect(factor.name).toBe('Test Factor');
      expect(factor.weight).toBe(0.5);
      expect(factor.value).toBe(0.8);
      expect(factor.contribution).toBe(0.4); // 0.5 * 0.8
      expect(factor.explanation).toBe('Test explanation');
    });
  });

  describe('DEFAULT_WEIGHTS', () => {
    it('should have weights that sum to 1', () => {
      const total = Object.values(DEFAULT_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(total).toBeCloseTo(1.0, 2);
    });

    it('should have all required weight types', () => {
      expect(DEFAULT_WEIGHTS.pattern).toBeDefined();
      expect(DEFAULT_WEIGHTS.sentiment).toBeDefined();
      expect(DEFAULT_WEIGHTS.textLength).toBeDefined();
      expect(DEFAULT_WEIGHTS.structure).toBeDefined();
    });
  });

  describe('THRESHOLD_PRESETS', () => {
    it('should have conservative preset with high thresholds', () => {
      expect(THRESHOLD_PRESETS.conservative.high).toBe(0.9);
      expect(THRESHOLD_PRESETS.conservative.medium).toBe(0.7);
      expect(THRESHOLD_PRESETS.conservative.low).toBe(0.5);
    });

    it('should have aggressive preset with low thresholds', () => {
      expect(THRESHOLD_PRESETS.aggressive.high).toBeLessThan(THRESHOLD_PRESETS.conservative.high);
      expect(THRESHOLD_PRESETS.aggressive.medium).toBeLessThan(THRESHOLD_PRESETS.conservative.medium);
      expect(THRESHOLD_PRESETS.aggressive.low).toBeLessThan(THRESHOLD_PRESETS.conservative.low);
    });

    it('should have moderate preset between conservative and aggressive', () => {
      expect(THRESHOLD_PRESETS.moderate.high).toBeLessThan(THRESHOLD_PRESETS.conservative.high);
      expect(THRESHOLD_PRESETS.moderate.high).toBeGreaterThan(THRESHOLD_PRESETS.aggressive.high);
    });
  });
});
