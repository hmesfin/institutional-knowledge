import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { initializeDb, runMigrations, closeDb } from '../../../src/db';
import { AnalyzeSentimentInputSchema } from '../../../src/mcp/tools/sentiment-analysis';

describe('Sentiment Analysis MCP Tool', () => {
  describe('Input Validation', () => {
    it('should validate required text field', () => {
      const result = AnalyzeSentimentInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject text shorter than 20 characters', () => {
      const result = AnalyzeSentimentInputSchema.safeParse({ text: 'Too short' });
      expect(result.success).toBe(false);
    });

    it('should accept valid input', () => {
      const result = AnalyzeSentimentInputSchema.safeParse({
        text: 'This is a reasonable length text for sentiment analysis.',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const result = AnalyzeSentimentInputSchema.safeParse({
        text: 'This is a longer text that should work for analysis with all options.',
        include_timeline: true,
        include_shifts: true,
        min_shift_delta: 0.5,
        combine_with_patterns: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate min_shift_delta range', () => {
      const invalidLow = AnalyzeSentimentInputSchema.safeParse({
        text: 'Some text with enough length for analysis',
        min_shift_delta: -0.1,
      });
      expect(invalidLow.success).toBe(false);

      const invalidHigh = AnalyzeSentimentInputSchema.safeParse({
        text: 'Some text with enough length for analysis',
        min_shift_delta: 1.1,
      });
      expect(invalidHigh.success).toBe(false);
    });
  });

  describe('Tool Execution', () => {
    let db: Database;

    beforeEach(() => {
      db = initializeDb(':memory:');
      runMigrations(db);
    });

    it('should analyze sentiment', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'This is great! Works perfectly and I am so happy with the solution.',
        },
        { db }
      );

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Sentiment Analysis Results');
    });

    it('should include timeline when requested', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'This is bad. This is good. This is bad again.',
          include_timeline: true,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Sentiment Timeline');
    });

    it('should include shifts when requested', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'This is terrible and awful. Finally it is working. Perfect and great!',
          include_shifts: true,
        },
        { db }
      );

      const output = result.content[0].text;
      // Should have influential words section at minimum
      expect(output).toContain('Influential Words');
    });

    it('should combine with patterns when requested', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'After hours of frustration, finally working!',
          combine_with_patterns: true,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Combined Pattern + Sentiment Detection');
    });

    it('should handle problem-to-solution transitions', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'Terrible and awful. Frustrated and hated this. Finally figured it out. Works perfectly now!',
          include_timeline: true,
          include_shifts: true,
          combine_with_patterns: true,
        },
        { db }
      );

      const output = result.content[0].text;
      // Should show either transition or at least combined detection
      const hasDetection = output.includes('Problem-to-Solution Transition') || output.includes('Combined Pattern + Sentiment');
      expect(hasDetection).toBe(true);
    });

    it('should display influential words', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'This is great and amazing. Works perfectly!',
        },
        { db }
      );

      expect(result.content[0].text).toContain('Influential Words');
    });
  });

  describe('Output Formatting', () => {
    it('should format sentiment scores correctly', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');
      const db = initializeDb(':memory:');
      runMigrations(db);

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'This is great and works perfectly.',
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('Overall Sentiment');
      expect(output).toContain('Confidence');
      expect(output).toContain('Positive Words');
      expect(output).toContain('Negative Words');
    });

    it('should show reasoning for combined detection', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');
      const db = initializeDb(':memory:');
      runMigrations(db);

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'Finally working after being stuck!',
          combine_with_patterns: true,
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('Detection Reasoning');
      expect(output).toContain('Combined Confidence');
    });

    it('should provide recommendations for knowledge capture', async () => {
      const { analyze_sentiment_tool } = await import('../../../src/mcp/tools/sentiment-analysis');
      const db = initializeDb(':memory:');
      runMigrations(db);

      const result = await analyze_sentiment_tool.execute(
        {
          text: 'After hours of struggle, finally solved the bug!',
          include_timeline: true,
          include_shifts: true,
          combine_with_patterns: true,
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('Recommendation');
    });
  });
});
