import { describe, it, expect } from 'bun:test';
import {
  analyzeSentiment,
  splitIntoSegments,
  createSentimentTimeline,
  detectSentimentShifts,
  hasProblemToSolutionTransition,
} from '../../src/sentiment/analyzer';

describe('Sentiment Analyzer', () => {
  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const text = 'This is great! It works perfectly and I am so happy with the solution.';
      const result = analyzeSentiment(text);

      expect(result.score).toBeGreaterThan(0);
      expect(result.positiveCount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const text = 'This is terrible! It is broken and I am so frustrated with this bug.';
      const result = analyzeSentiment(text);

      expect(result.score).toBeLessThan(0);
      expect(result.negativeCount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect neutral sentiment', () => {
      const text = 'The code is written in TypeScript and uses the Bun runtime.';
      const result = analyzeSentiment(text);

      expect(result.score).toBeCloseTo(0, 1);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should track influential words', () => {
      const text = 'This is great and works perfectly.';
      const result = analyzeSentiment(text);

      expect(result.influentialWords.length).toBeGreaterThan(0);
      expect(result.influentialWords[0]).toHaveProperty('word');
      expect(result.influentialWords[0]).toHaveProperty('sentiment');
      expect(result.influentialWords[0]).toHaveProperty('position');
    });

    it('should handle negation correctly', () => {
      const text1 = 'This is good and works';
      const text2 = 'This is not good and does not work';

      const result1 = analyzeSentiment(text1);
      const result2 = analyzeSentiment(text2);

      expect(result1.score).toBeGreaterThan(0);
      expect(result2.score).toBeLessThan(result1.score);
    });

    it('should apply intensifiers', () => {
      const text1 = 'This is good';
      const text2 = 'This is very very good and amazing';

      const result1 = analyzeSentiment(text1);
      const result2 = analyzeSentiment(text2);

      // More intense text should have higher influential word count
      expect(result2.influentialWords.length).toBeGreaterThan(result1.influentialWords.length);
    });

    it('should calculate confidence based on influential words', () => {
      const text1 = 'great';
      const text2 = 'great amazing fantastic perfect wonderful';

      const result1 = analyzeSentiment(text1);
      const result2 = analyzeSentiment(text2);

      expect(result2.confidence).toBeGreaterThan(result1.confidence);
    });

    it('should handle empty text', () => {
      const result = analyzeSentiment('');

      expect(result.score).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.influentialWords).toEqual([]);
    });
  });

  describe('splitIntoSegments', () => {
    it('should split text into segments', () => {
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      const segments = splitIntoSegments(text, 50);

      expect(segments.length).toBeGreaterThan(0);
      segments.forEach((segment) => {
        expect(segment).toHaveProperty('text');
        expect(segment).toHaveProperty('start');
        expect(segment).toHaveProperty('end');
        expect(segment.text.length).toBeGreaterThan(0);
      });
    });

    it('should respect segment size', () => {
      const text = 'This is a test. '.repeat(100);
      const segments = splitIntoSegments(text, 200);

      // At least some segments should respect the size
      const sizedSegments = segments.filter((s) => s.text.length <= 250);
      expect(sizedSegments.length).toBeGreaterThan(0);
    });

    it('should handle short text', () => {
      const text = 'Short text.';
      const segments = splitIntoSegments(text, 200);

      expect(segments.length).toBe(1);
      expect(segments[0].text).toContain('Short text');
    });
  });

  describe('createSentimentTimeline', () => {
    it('should create sentiment timeline', () => {
      const text =
        'This is terrible and broken. Finally fixed it! Now it works great and I am happy.';
      const timeline = createSentimentTimeline(text, 50);

      expect(timeline.segments.length).toBeGreaterThan(0);
      expect(timeline.overall).toBeGreaterThanOrEqual(-1);
      expect(timeline.overall).toBeLessThanOrEqual(1);
    });

    it('should track sentiment changes over segments', () => {
      const text = 'This is terrible and broken. Finally fixed it! Now it works great and I am happy.';
      const timeline = createSentimentTimeline(text, 30);

      expect(timeline.segments.length).toBeGreaterThan(1);

      // Sentiment should vary between segments
      const scores = timeline.segments.map((s) => s.score);
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBeGreaterThan(1);
    });

    it('should calculate overall sentiment', () => {
      const text = 'This is great and amazing. This is wonderful and fantastic.';
      const timeline = createSentimentTimeline(text, 50);

      expect(timeline.overall).toBeGreaterThan(0);
    });
  });

  describe('detectSentimentShifts', () => {
    it('should detect negative to positive shifts', () => {
      const text = 'This is terrible and broken and awful. Finally fixed it! Now it works great and amazing.';
      const shifts = detectSentimentShifts(text, 0.4);

      const positiveShifts = shifts.filter((s) => s.type === 'negative-to-positive');
      expect(positiveShifts.length).toBeGreaterThan(0);
    });

    it('should detect positive to negative shifts', () => {
      const text = 'This is great and works perfectly. But now it is broken and terrible again.';
      const shifts = detectSentimentShifts(text, 0.4);

      const negativeShifts = shifts.filter((s) => s.type === 'positive-to-negative');
      expect(negativeShifts.length).toBeGreaterThan(0);
    });

    it('should respect minimum delta threshold', () => {
      const text = 'This is bad. This is good.';
      const shiftsLow = detectSentimentShifts(text, 0.1);
      const shiftsHigh = detectSentimentShifts(text, 0.8);

      expect(shiftsHigh.length).toBeLessThanOrEqual(shiftsLow.length);
    });

    it('should return shift details', () => {
      const text = 'This is terrible. Finally works!';
      const shifts = detectSentimentShifts(text, 0.3);

      if (shifts.length > 0) {
        expect(shifts[0]).toHaveProperty('from');
        expect(shifts[0]).toHaveProperty('to');
        expect(shifts[0]).toHaveProperty('delta');
        expect(shifts[0]).toHaveProperty('position');
        expect(shifts[0]).toHaveProperty('type');
      }
    });

    it('should handle no shifts', () => {
      const text = 'This is neutral text with no strong sentiment changes throughout.';
      const shifts = detectSentimentShifts(text, 0.5);

      expect(shifts.length).toBe(0);
    });
  });

  describe('hasProblemToSolutionTransition', () => {
    it('should detect problem-to-solution transition', () => {
      const text =
        'I was stuck and frustrated and hated this bug. Finally figured it out. Now it works perfectly!';
      const hasTransition = hasProblemToSolutionTransition(text);

      expect(hasTransition).toBe(true);
    });

    it('should return false for no transition', () => {
      const text = 'This is consistently great throughout the entire text.';
      const hasTransition = hasProblemToSolutionTransition(text);

      expect(hasTransition).toBe(false);
    });

    it('should return false for consistently negative text', () => {
      const text = 'This is terrible and broken and awful. I hate this bug so much.';
      const hasTransition = hasProblemToSolutionTransition(text);

      expect(hasTransition).toBe(false);
    });

    it('should detect subtle transitions', () => {
      const text = 'Struggling and stuck. Made progress. Getting clearer. Finally solved it and works!';
      const hasTransition = hasProblemToSolutionTransition(text);

      expect(hasTransition).toBe(true);
    });
  });
});
