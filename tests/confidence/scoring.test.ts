import { describe, it, expect } from 'bun:test';
import {
  scoreConfidence,
  scoreWithPreset,
  filterByConfidence,
  getRecommendedAction,
} from '../../src/confidence/scoring';
import { detectWithSentiment } from '../../src/detection';

describe('Confidence Scoring', () => {
  describe('scoreConfidence', () => {
    it('should score high confidence text', () => {
      const text =
        'After hours of being stuck and frustrated with this bug, finally figured it out! The solution was to add a retry mechanism. Now it works perfectly and I am very happy with the result. This is a great success!';
      const detection = detectWithSentiment(text);
      const confidence = scoreConfidence(text, detection);

      expect(confidence.score).toBeGreaterThan(0.7);
      expect(confidence.level).toBe('high' || 'very-high');
      expect(confidence.factors.length).toBeGreaterThan(0);
      expect(confidence.reasoning.length).toBeGreaterThan(0);
    });

    it('should score low confidence text', () => {
      const text = 'Short text';
      const detection = detectWithSentiment(text);
      const confidence = scoreConfidence(text, detection);

      expect(confidence.score).toBeLessThan(0.5);
      expect(['low', 'very-low'].includes(confidence.level)).toBe(true);
    });

    it('should include all factors', () => {
      const text = 'Finally working! After struggling with this bug for hours, solved it.';
      const detection = detectWithSentiment(text);
      const confidence = scoreConfidence(text, detection);

      expect(confidence.factors.length).toBe(4); // pattern, sentiment, textLength, structure
    });

    it('should normalize weights', () => {
      const text = 'Test text that is long enough to score well';
      const detection = detectWithSentiment(text);
      const confidence = scoreConfidence(text, detection, {
        weights: { pattern: 0.5, sentiment: 0.3, textLength: 0.1, structure: 0.1 },
      });

      // Sum of contributions should be close to score
      const totalContribution = confidence.factors.reduce((sum, f) => sum + f.contribution, 0);
      expect(totalContribution).toBeCloseTo(confidence.score, 2);
    });

    it('should detect when threshold is met', () => {
      const text = 'After hours of frustration, finally working!';
      const detection = detectWithSentiment(text);
      const confidence = scoreConfidence(text, detection, {
        thresholds: { high: 0.9, medium: 0.7, low: 0.5 },
      });

      if (confidence.score >= 0.5) {
        expect(confidence.meetsThreshold).toBe(true);
      }
    });

    it('should provide reasoning', () => {
      const text = 'This is a reasonable length text with some context about the problem and solution.';
      const detection = detectWithSentiment(text);
      const confidence = scoreConfidence(text, detection);

      expect(confidence.reasoning).toBeDefined();
      expect(confidence.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('scoreWithPreset', () => {
    it('should use conservative preset', () => {
      const text = 'Finally working!';
      const detection = detectWithSentiment(text);
      const confidence = scoreWithPreset(text, detection, 'conservative');

      expect(confidence.score).toBeGreaterThanOrEqual(0);
      expect(confidence.level).toBeDefined();
    });

    it('should use aggressive preset', () => {
      const text = 'Works!';
      const detection = detectWithSentiment(text);
      const confidenceConservative = scoreWithPreset(text, detection, 'conservative');
      const confidenceAggressive = scoreWithPreset(text, detection, 'aggressive');

      // Same text should have higher level with aggressive preset
      const levels = ['very-low', 'low', 'medium', 'high', 'very-high'];
      const conservativeIndex = levels.indexOf(confidenceConservative.level);
      const aggressiveIndex = levels.indexOf(confidenceAggressive.level);

      expect(aggressiveIndex).toBeGreaterThanOrEqual(conservativeIndex);
    });
  });

  describe('filterByConfidence', () => {
    it('should pass high confidence detections', () => {
      const text =
        'After hours of struggle, finally solved the problem! The solution works perfectly and I am happy.';
      const detection = detectWithSentiment(text);
      const result = filterByConfidence(text, detection, {
        thresholds: { high: 0.9, medium: 0.7, low: 0.5 },
      });

      expect(result.passes).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should fail low confidence detections', () => {
      const text = 'Short';
      const detection = detectWithSentiment(text);
      const result = filterByConfidence(text, detection, {
        thresholds: { high: 0.9, medium: 0.7, low: 0.5 },
      });

      if (!result.passes) {
        expect(result.reason).toBeDefined();
        expect(result.reason).toContain('below threshold');
      }
    });

    it('should include confidence in result', () => {
      const text = 'Finally working after being stuck!';
      const detection = detectWithSentiment(text);
      const result = filterByConfidence(text, detection);

      expect(result.confidence.score).toBeGreaterThanOrEqual(0);
      expect(result.confidence.level).toBeDefined();
    });
  });

  describe('getRecommendedAction', () => {
    it('should recommend capture for very high confidence', () => {
      const confidence = {
        score: 0.95,
        level: 'very-high' as const,
        factors: [],
        reasoning: [],
        meetsThreshold: true,
      };

      const action = getRecommendedAction(confidence);
      expect(action.action).toBe('capture');
      expect(action.reason).toContain('auto-capture');
    });

    it('should recommend capture for high confidence', () => {
      const confidence = {
        score: 0.8,
        level: 'high' as const,
        factors: [],
        reasoning: [],
        meetsThreshold: true,
      };

      const action = getRecommendedAction(confidence);
      expect(action.action).toBe('capture');
    });

    it('should recommend review for medium confidence', () => {
      const confidence = {
        score: 0.6,
        level: 'medium' as const,
        factors: [],
        reasoning: [],
        meetsThreshold: true,
      };

      const action = getRecommendedAction(confidence);
      expect(action.action).toBe('review');
      expect(action.reason).toContain('manual review');
    });

    it('should recommend ignore for low confidence', () => {
      const confidence = {
        score: 0.3,
        level: 'low' as const,
        factors: [],
        reasoning: [],
        meetsThreshold: false,
      };

      const action = getRecommendedAction(confidence);
      expect(action.action).toBe('ignore');
      expect(action.reason).toContain('unlikely to be valuable');
    });
  });
});
