import { describe, it, expect } from 'bun:test';
import { detectWithSentiment } from '../../src/detection/combined-detector';

describe('Combined Pattern + Sentiment Detector', () => {
  describe('detectWithSentiment', () => {
    it('should combine pattern and sentiment detection', () => {
      const text =
        'After hours of being stuck and frustrated with this bug, finally figured it out and it works!';
      const result = detectWithSentiment(text);

      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('shifts');
      expect(result).toHaveProperty('hasTransition');
      expect(result).toHaveProperty('combinedConfidence');
      expect(result).toHaveProperty('reasoning');
    });

    it('should detect problem-to-solution transitions', () => {
      const text =
        'I was so frustrated and stuck and hated this bug for hours. Finally working now! The solution was to add a retry mechanism.';
      const result = detectWithSentiment(text);

      expect(result.detected).toBe(true);
      // The pattern detection should work even if sentiment transition is subtle
      expect(result.combinedConfidence).toBeGreaterThan(0.5);
    });

    it('should provide sentiment analysis', () => {
      const text = 'This is great! Works perfectly and I am so happy.';
      const result = detectWithSentiment(text);

      expect(result.sentiment.score).toBeGreaterThan(0);
      expect(result.sentiment.positiveCount).toBeGreaterThan(0);
      expect(result.sentiment.confidence).toBeGreaterThanOrEqual(0);
      expect(result.sentiment.confidence).toBeLessThanOrEqual(1);
    });

    it('should create sentiment timeline', () => {
      const text = 'This is bad. This is good. This is bad. This is good.';
      const result = detectWithSentiment(text);

      expect(result.timeline.segments.length).toBeGreaterThan(0);
      expect(result.timeline.overall).toBeGreaterThanOrEqual(-1);
      expect(result.timeline.overall).toBeLessThanOrEqual(1);
    });

    it('should provide reasoning for detection', () => {
      const text = 'Finally working! Found the bug and fixed it.';
      const result = detectWithSentiment(text);

      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should calculate combined confidence', () => {
      const text = 'Finally working after being stuck for hours!';
      const result = detectWithSentiment(text);

      expect(result.combinedConfidence).toBeGreaterThanOrEqual(0);
      expect(result.combinedConfidence).toBeLessThanOrEqual(1);
    });

    it('should require both pattern and sentiment when configured', () => {
      const text = 'Finally working!';
      const result1 = detectWithSentiment(text, { requireBoth: true });
      const result2 = detectWithSentiment(text, { requireBoth: false });

      expect(result1.combinedConfidence).toBeDefined();
      expect(result2.combinedConfidence).toBeDefined();
    });

    it('should handle text with no patterns or sentiment', () => {
      const text = 'This is a neutral sentence about programming in TypeScript.';
      const result = detectWithSentiment(text);

      expect(result.detected).toBe(false);
      expect(result.combinedConfidence).toBeLessThan(0.5);
    });

    it('should boost confidence when both pattern and sentiment agree', () => {
      const text1 = 'Finally working!';
      const text2 = 'After hours of struggle, finally got it working!';

      const result1 = detectWithSentiment(text1);
      const result2 = detectWithSentiment(text2);

      // Text with both clear pattern and strong sentiment should have higher confidence
      expect(result2.combinedConfidence).toBeGreaterThan(result1.combinedConfidence);
    });

    it('should respect minimum sentiment shift option', () => {
      const text = 'This is bad. This is good.';
      const result1 = detectWithSentiment(text, { minSentimentShift: 0.2 });
      const result2 = detectWithSentiment(text, { minSentimentShift: 0.8 });

      expect(result1.shifts.length).toBeGreaterThanOrEqual(result2.shifts.length);
    });

    it('should handle very long texts', () => {
      const text =
        'This is terrible and broken. ' +
        'This is also bad and frustrating. ' +
        'Still very stuck and confused. ' +
        'Making some small progress now. ' +
        'Getting a bit clearer. ' +
        'Almost there finally. ' +
        'Finally solved it! ' +
        'Works perfectly now. ' +
        'So happy with the solution. ' +
        'Great success!';

      const result = detectWithSentiment(text);

      expect(result.timeline.segments.length).toBeGreaterThan(1);
      expect(result.shifts.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Calculation', () => {
    it('should give highest confidence when both pattern and sentiment agree', () => {
      const patternAndSentiment = 'After hours of frustration, finally working!';
      const result = detectWithSentiment(patternAndSentiment, { requireBoth: false });

      expect(result.combinedConfidence).toBeGreaterThan(0.7);
    });

    it('should give moderate confidence for pattern only', () => {
      const patternOnly = 'Finally working!';
      const result = detectWithSentiment(patternOnly, { requireBoth: false });

      // Should still detect due to pattern
      expect(result.combinedConfidence).toBeGreaterThan(0);
    });

    it('should give moderate confidence for sentiment transition only', () => {
      const sentimentOnly = 'This was terrible and awful. Finally good and working!';
      const result = detectWithSentiment(sentimentOnly, { requireBoth: false });

      // Should detect due to sentiment shift even without strong pattern
      expect(result.combinedConfidence).toBeGreaterThan(0);
    });

    it('should give low confidence for weak signals', () => {
      const weak = 'This is okay.';
      const result = detectWithSentiment(weak, { requireBoth: false });

      expect(result.combinedConfidence).toBeLessThan(0.5);
    });
  });
});
