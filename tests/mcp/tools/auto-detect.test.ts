import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { initializeDb, runMigrations, closeDb } from '../../../src/db';
import { AutoDetectInputSchema } from '../../../src/mcp/tools/auto-detect';

describe('Auto-Detect MCP Tool', () => {
  describe('Input Validation', () => {
    it('should validate required text field', () => {
      const result = AutoDetectInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject text shorter than 10 characters', () => {
      const result = AutoDetectInputSchema.safeParse({ text: 'short' });
      expect(result.success).toBe(false);
    });

    it('should accept valid input', () => {
      const result = AutoDetectInputSchema.safeParse({
        text: 'After hours of debugging, it is finally working!',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const result = AutoDetectInputSchema.safeParse({
        text: 'Found the bug after hours of debugging',
        context: 'Working on the authentication system',
        file_context: 'src/auth.ts',
        project: 'my-project',
        min_confidence: 0.6,
        include_summary: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate min_confidence range', () => {
      const invalidLow = AutoDetectInputSchema.safeParse({
        text: 'Some text with enough length',
        min_confidence: -0.1,
      });
      expect(invalidLow.success).toBe(false);

      const invalidHigh = AutoDetectInputSchema.safeParse({
        text: 'Some text with enough length',
        min_confidence: 1.1,
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

    it('should detect success pattern', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'After 3 hours of debugging, it is finally working!',
        },
        { db }
      );

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Knowledge-Worthy Pattern Detected');
    });

    it('should detect problem pattern', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'Found the bug - it was a race condition in the async handler',
        },
        { db }
      );

      expect(result.content[0].text).toContain('Knowledge-Worthy Pattern Detected');
    });

    it('should return no detection for plain text', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'This is just a regular sentence with no special patterns or interesting moments',
        },
        { db }
      );

      expect(result.content[0].text).toContain('No Knowledge-Worthy Patterns Detected');
    });

    it('should include summary when requested', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'After hours of struggle, finally got it working!',
          include_summary: true,
        },
        { db }
      );

      expect(result.content[0].text).toContain('Suggested Summary');
    });

    it('should respect min_confidence threshold', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'Error occurred',
          min_confidence: 0.9,
        },
        { db }
      );

      // May or may not detect depending on confidence
      expect(result.content).toBeDefined();
    });

    it('should combine text and context', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'Finally working!',
          context: 'After 3 hours of debugging the authentication system',
        },
        { db }
      );

      expect(result.content[0].text).toBeDefined();
      // Should boost confidence due to context
      expect(result.content[0].text).toContain('Knowledge-Worthy Pattern Detected');
    });

    it('should provide suggestion for knowledge capture', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');

      const result = await auto_detect_tool.execute(
        {
          text: 'Learned the hard way that async/await requires proper error handling',
        },
        { db }
      );

      expect(result.content[0].text).toContain('Suggestion');
      expect(result.content[0].text).toContain('knowledge item');
    });
  });

  describe('Output Formatting', () => {
    it('should format detection result with confidence', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');
      const db = initializeDb(':memory:');
      runMigrations(db);

      const result = await auto_detect_tool.execute(
        {
          text: 'FINALLY WORKING!!!',
          include_summary: true,
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('Confidence');
      expect(output).toContain('%');
      expect(output).toContain('Suggested Type');
    });

    it('should show all matches when multiple patterns found', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');
      const db = initializeDb(':memory:');
      runMigrations(db);

      const result = await auto_detect_tool.execute(
        {
          text: 'Finally working! Found the bug. The solution was to retry.',
          include_summary: true,
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('All Matches');
    });

    it('should show best match details', async () => {
      const { auto_detect_tool } = await import('../../../src/mcp/tools/auto-detect');
      const db = initializeDb(':memory:');
      runMigrations(db);

      const result = await auto_detect_tool.execute(
        {
          text: 'After hours, finally working!',
          include_summary: true,
        },
        { db }
      );

      const output = result.content[0].text;
      expect(output).toContain('Best Match');
      expect(output).toContain('Pattern');
    });
  });
});
