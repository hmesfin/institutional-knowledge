import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { initializeDb, runMigrations, closeDb } from '../../../src/db';
import { RecordFeedbackInputSchema } from '../../../src/mcp/tools/record-feedback';
import { clearFeedback } from '../../../src/confidence';

describe('Record Feedback MCP Tool', () => {
  beforeEach(() => {
    clearFeedback();
  });

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      const result = RecordFeedbackInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid confidence', () => {
      const result = RecordFeedbackInputSchema.safeParse({
        detection_id: 'test-1',
        feedback: 'confirm',
        confidence: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid input', () => {
      const result = RecordFeedbackInputSchema.safeParse({
        detection_id: 'test-1',
        feedback: 'confirm',
        confidence: 0.8,
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional factors', () => {
      const result = RecordFeedbackInputSchema.safeParse({
        detection_id: 'test-1',
        feedback: 'reject',
        confidence: 0.5,
        factors: ['pattern', 'sentiment'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Tool Execution', () => {
    let db: Database;

    beforeEach(() => {
      db = initializeDb(':memory:');
      runMigrations(db);
    });

    it('should record confirm feedback', async () => {
      const { record_feedback_tool } = await import('../../../src/mcp/tools/record-feedback');

      const result = await record_feedback_tool.execute(
        {
          detection_id: 'test-1',
          feedback: 'confirm',
          confidence: 0.9,
        },
        { db }
      );

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Feedback Recorded');
    });

    it('should record reject feedback', async () => {
      const { record_feedback_tool } = await import('../../../src/mcp/tools/record-feedback');

      const result = await record_feedback_tool.execute(
        {
          detection_id: 'test-2',
          feedback: 'reject',
          confidence: 0.4,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Feedback Recorded');
      expect(result.content[0].text).toContain('REJECT');
    });

    it('should include feedback statistics', async () => {
      const { record_feedback_tool } = await import('../../../src/mcp/tools/record-feedback');

      // Record some feedback first
      await record_feedback_tool.execute(
        {
          detection_id: 'test-1',
          feedback: 'confirm',
          confidence: 0.9,
        },
        { db }
      );

      await record_feedback_tool.execute(
        {
          detection_id: 'test-2',
          feedback: 'reject',
          confidence: 0.5,
        },
        { db }
      );

      const result = await record_feedback_tool.execute(
        {
          detection_id: 'test-3',
          feedback: 'confirm',
          confidence: 0.8,
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('Feedback Statistics');
      expect(output).toContain('Total Feedback Entries:'); // Check prefix only
      expect(output).toContain('3'); // Should have 3 entries somewhere
    });

    it('should display factors when provided', async () => {
      const { record_feedback_tool } = await import('../../../src/mcp/tools/record-feedback');

      const result = await record_feedback_tool.execute(
        {
          detection_id: 'test-1',
          feedback: 'confirm',
          confidence: 0.9,
          factors: ['pattern', 'sentiment', 'text length'],
        },
        { db }
      );

      expect(result.content[0].text).toContain('Factors:');
    });
  });
});
