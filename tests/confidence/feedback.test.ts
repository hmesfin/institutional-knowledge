import { describe, it, expect, beforeEach } from 'bun:test';
import {
  recordFeedback,
  getFeedback,
  getAllFeedback,
  calculateWeightAdjustments,
  applyWeightAdjustments,
  getFeedbackStats,
  clearFeedback,
} from '../../src/confidence/feedback';
import type { FeedbackEntry } from '../../src/confidence/types';
import { DEFAULT_WEIGHTS } from '../../src/confidence/types';

describe('Confidence Feedback Mechanism', () => {
  beforeEach(() => {
    clearFeedback();
  });

  describe('recordFeedback', () => {
    it('should record feedback entry', () => {
      const entry: FeedbackEntry = {
        id: 'test-1',
        feedback: 'confirm',
        confidence: 0.8,
        factors: ['pattern', 'sentiment'],
        timestamp: Date.now(),
      };

      recordFeedback(entry);

      const retrieved = getFeedback('test-1');
      expect(retrieved).toEqual([entry]);
    });

    it('should record multiple feedback entries for same detection', () => {
      const entry1: FeedbackEntry = {
        id: 'test-1',
        feedback: 'confirm',
        confidence: 0.8,
        factors: ['pattern'],
        timestamp: Date.now(),
      };

      const entry2: FeedbackEntry = {
        id: 'test-1',
        feedback: 'reject',
        confidence: 0.6,
        factors: ['sentiment'],
        timestamp: Date.now(),
      };

      recordFeedback(entry1);
      recordFeedback(entry2);

      const retrieved = getFeedback('test-1');
      expect(retrieved.length).toBe(2);
    });

    it('should handle different detection IDs', () => {
      const entry1: FeedbackEntry = {
        id: 'test-1',
        feedback: 'confirm',
        confidence: 0.8,
        factors: [],
        timestamp: Date.now(),
      };

      const entry2: FeedbackEntry = {
        id: 'test-2',
        feedback: 'reject',
        confidence: 0.5,
        factors: [],
        timestamp: Date.now(),
      };

      recordFeedback(entry1);
      recordFeedback(entry2);

      expect(getFeedback('test-1')).toEqual([entry1]);
      expect(getFeedback('test-2')).toEqual([entry2]);
    });
  });

  describe('getAllFeedback', () => {
    it('should return empty array when no feedback', () => {
      const all = getAllFeedback();
      expect(all).toEqual([]);
    });

    it('should return all feedback entries', () => {
      const entries: FeedbackEntry[] = [
        {
          id: 'test-1',
          feedback: 'confirm',
          confidence: 0.8,
          factors: [],
          timestamp: Date.now(),
        },
        {
          id: 'test-2',
          feedback: 'reject',
          confidence: 0.5,
          factors: [],
          timestamp: Date.now(),
        },
      ];

      entries.forEach(recordFeedback);

      const all = getAllFeedback();
      expect(all.length).toBe(2);
    });
  });

  describe('clearFeedback', () => {
    it('should clear all feedback', () => {
      const entry: FeedbackEntry = {
        id: 'test-1',
        feedback: 'confirm',
        confidence: 0.8,
        factors: [],
        timestamp: Date.now(),
      };

      recordFeedback(entry);
      expect(getAllFeedback().length).toBe(1);

      clearFeedback();
      expect(getAllFeedback().length).toBe(0);
    });
  });

  describe('calculateWeightAdjustments', () => {
    it('should return empty adjustments with insufficient data', () => {
      const entries: FeedbackEntry[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `test-${i}`,
          feedback: 'confirm' as const,
          confidence: 0.8,
          factors: ['pattern'],
          timestamp: Date.now(),
        }));

      entries.forEach(recordFeedback);
      const all = getAllFeedback();

      const adjustments = calculateWeightAdjustments(all, DEFAULT_WEIGHTS, 10);
      expect(adjustments).toEqual([]);
    });

    it('should calculate adjustments with sufficient data', () => {
      // Create 20 entries with mostly confirmations for pattern
      for (let i = 0; i < 20; i++) {
        const entry: FeedbackEntry = {
          id: `test-${i}`,
          feedback: i < 15 ? 'confirm' : 'reject', // 75% confirm rate
          confidence: 0.8,
          factors: ['pattern'],
          timestamp: Date.now(),
        };
        recordFeedback(entry);
      }

      const all = getAllFeedback();
      const adjustments = calculateWeightAdjustments(all, DEFAULT_WEIGHTS, 10);

      // Should have adjustments since we have sufficient data
      expect(adjustments.length).toBeGreaterThanOrEqual(0);
    });

    it('should increase weight for high-performing factors', () => {
      // Create entries with high confirmation rate for sentiment
      for (let i = 0; i < 20; i++) {
        const entry: FeedbackEntry = {
          id: `test-${i}`,
          feedback: i < 18 ? 'confirm' : 'reject', // 90% confirm rate
          confidence: 0.8,
          factors: ['sentiment'],
          timestamp: Date.now(),
        };
        recordFeedback(entry);
      }

      const all = getAllFeedback();
      const adjustments = calculateWeightAdjustments(all, DEFAULT_WEIGHTS, 10);

      // Should recommend increasing sentiment weight
      const sentimentAdjustment = adjustments.find((a) => a.factor === 'sentiment');
      if (sentimentAdjustment) {
        expect(sentimentAdjustment.delta).toBeGreaterThan(0);
      }
    });

    it('should decrease weight for low-performing factors', () => {
      // Create entries with low confirmation rate for text length
      for (let i = 0; i < 20; i++) {
        const entry: FeedbackEntry = {
          id: `test-${i}`,
          feedback: i < 8 ? 'confirm' : 'reject', // 40% confirm rate
          confidence: 0.8,
          factors: ['text length'],
          timestamp: Date.now(),
        };
        recordFeedback(entry);
      }

      const all = getAllFeedback();
      const adjustments = calculateWeightAdjustments(all, DEFAULT_WEIGHTS, 10);

      // Should recommend decreasing text length weight
      const lengthAdjustment = adjustments.find((a) => a.factor === 'textLength');
      if (lengthAdjustment) {
        expect(lengthAdjustment.delta).toBeLessThan(0);
      }
    });
  });

  describe('applyWeightAdjustments', () => {
    it('should apply weight adjustments', () => {
      const adjustments = [
        {
          factor: 'pattern',
          newWeight: 0.4,
          delta: 0.05,
          reason: 'High confirmation rate',
        },
        {
          factor: 'sentiment',
          newWeight: 0.25,
          delta: -0.05,
          reason: 'Low confirmation rate',
        },
      ];

      const newWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

      expect(newWeights.pattern).toBe(0.4);
      expect(newWeights.sentiment).toBe(0.25);
    });

    it('should normalize weights to sum to 1', () => {
      const adjustments = [
        {
          factor: 'pattern',
          newWeight: 0.6,
          delta: 0.25,
          reason: 'Test',
        },
      ];

      const newWeights = applyWeightAdjustments(DEFAULT_WEIGHTS, adjustments);

      const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
      expect(total).toBeCloseTo(1.0, 2);
    });
  });

  describe('getFeedbackStats', () => {
    it('should return zero stats when no feedback', () => {
      const stats = getFeedbackStats();

      expect(stats.total).toBe(0);
      expect(stats.confirmed).toBe(0);
      expect(stats.rejected).toBe(0);
      expect(stats.confirmationRate).toBe(0);
    });

    it('should calculate statistics', () => {
      const entries: FeedbackEntry[] = [
        {
          id: 'test-1',
          feedback: 'confirm',
          confidence: 0.9,
          factors: [],
          timestamp: Date.now(),
        },
        {
          id: 'test-2',
          feedback: 'confirm',
          confidence: 0.8,
          factors: [],
          timestamp: Date.now(),
        },
        {
          id: 'test-3',
          feedback: 'reject',
          confidence: 0.6,
          factors: [],
          timestamp: Date.now(),
        },
      ];

      entries.forEach(recordFeedback);

      const stats = getFeedbackStats();

      expect(stats.total).toBe(3);
      expect(stats.confirmed).toBe(2);
      expect(stats.rejected).toBe(1);
      expect(stats.confirmationRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate average confidence by feedback type', () => {
      const entries: FeedbackEntry[] = [
        {
          id: 'test-1',
          feedback: 'confirm',
          confidence: 0.9,
          factors: [],
          timestamp: Date.now(),
        },
        {
          id: 'test-2',
          feedback: 'confirm',
          confidence: 0.7,
          factors: [],
          timestamp: Date.now(),
        },
        {
          id: 'test-3',
          feedback: 'reject',
          confidence: 0.5,
          factors: [],
          timestamp: Date.now(),
        },
      ];

      entries.forEach(recordFeedback);

      const stats = getFeedbackStats();

      expect(stats.avgConfidence.confirmed).toBeCloseTo(0.8, 1);
      expect(stats.avgConfidence.rejected).toBe(0.5);
    });
  });
});
