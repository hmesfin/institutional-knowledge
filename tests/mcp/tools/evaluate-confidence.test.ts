import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { initializeDb, runMigrations, closeDb } from '../../../src/db';
import { EvaluateConfidenceInputSchema } from '../../../src/mcp/tools/evaluate-confidence';

describe('Evaluate Confidence MCP Tool', () => {
  describe('Input Validation', () => {
    it('should validate required text field', () => {
      const result = EvaluateConfidenceInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject text shorter than 20 characters', () => {
      const result = EvaluateConfidenceInputSchema.safeParse({ text: 'Too short' });
      expect(result.success).toBe(false);
    });

    it('should accept valid input', () => {
      const result = EvaluateConfidenceInputSchema.safeParse({
        text: 'This is a reasonable length text for confidence evaluation.',
      });
      expect(result.success).toBe(true);
    });

    it('should accept preset option', () => {
      const result = EvaluateConfidenceInputSchema.safeParse({
        text: 'This is a reasonable length text for confidence evaluation.',
        preset: 'conservative',
      });
      expect(result.success).toBe(true);
    });

    it('should accept custom thresholds', () => {
      const result = EvaluateConfidenceInputSchema.safeParse({
        text: 'This is a reasonable length text for confidence evaluation.',
        custom_high_threshold: 0.95,
        custom_medium_threshold: 0.75,
        custom_low_threshold: 0.55,
      });
      expect(result.success).toBe(true);
    });

    it('should validate threshold ranges', () => {
      const invalidHigh = EvaluateConfidenceInputSchema.safeParse({
        text: 'This is a reasonable length text for confidence evaluation.',
        custom_high_threshold: 1.5,
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

    it('should evaluate confidence', async () => {
      const { evaluate_confidence_tool } = await import('../../../src/mcp/tools/evaluate-confidence');

      const result = await evaluate_confidence_tool.execute(
        {
          text: 'After hours of frustration, finally working! This is a great success.',
        },
        { db }
      );

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Confidence Analysis');
    });

    it('should include factors when requested', async () => {
      const { evaluate_confidence_tool } = await import('../../../src/mcp/tools/evaluate-confidence');

      const result = await evaluate_confidence_tool.execute(
        {
          text: 'Finally working after being stuck!',
          include_factors: true,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Confidence Factors');
    });

    it('should apply threshold when requested', async () => {
      const { evaluate_confidence_tool } = await import('../../../src/mcp/tools/evaluate-confidence');

      const result = await evaluate_confidence_tool.execute(
        {
          text: 'Short',
          apply_threshold: true,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Below Confidence Threshold');
    });

    it('should show weight adjustment info when requested', async () => {
      const { evaluate_confidence_tool } = await import('../../../src/mcp/tools/evaluate-confidence');

      const result = await evaluate_confidence_tool.execute(
        {
          text: 'Finally working!',
          adjust_weights: true,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Weight Adjustment');
    });
  });
});
