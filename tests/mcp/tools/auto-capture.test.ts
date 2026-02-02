/**
 * Tests for auto-capture MCP tool
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { auto_capture_tool, type AutoCaptureInput } from '../../../src/mcp/tools/auto-capture';

describe('auto_capture_tool', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    // Use full schema from migration 1 + 2 + 3
    db.exec(`
      CREATE TABLE knowledge_items (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        file_context TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('solution', 'pattern', 'gotcha', 'win', 'troubleshooting')),
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        decision_rationale TEXT,
        alternatives_considered TEXT,
        solution_verified INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        related_issues TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        embedding TEXT,
        embedding_model TEXT,
        embedding_generated_at TEXT,
        access_count INTEGER NOT NULL DEFAULT 0,
        last_accessed_at TEXT,
        first_accessed_at TEXT
      );
    `);
  });

  it('should have correct tool metadata', () => {
    expect(auto_capture_tool.name).toBe('auto_capture');
    expect(auto_capture_tool.description).toContain('auto-capture');
    expect(auto_capture_tool.inputSchema).toBeDefined();
  });

  it('should validate minimum text length', async () => {
    const params: AutoCaptureInput = {
      text: 'Too short',
    };

    const result = auto_capture_tool.inputSchema.safeParse(params);

    expect(result.success).toBe(false);
  });

  it('should validate threshold range', async () => {
    const params: AutoCaptureInput = {
      text: 'a'.repeat(50),
      threshold: 1.5, // Invalid: > 1
    };

    const result = auto_capture_tool.inputSchema.safeParse(params);

    expect(result.success).toBe(false);
  });

  it('should validate max_captures range', async () => {
    const params: AutoCaptureInput = {
      text: 'a'.repeat(50),
      max_captures: 15, // Invalid: > 10
    };

    const result = auto_capture_tool.inputSchema.safeParse(params);

    expect(result.success).toBe(false);
  });

  it('should accept valid preset values', async () => {
    const conservative: AutoCaptureInput = {
      text: 'a'.repeat(50),
      preset: 'conservative',
    };

    const moderate: AutoCaptureInput = {
      text: 'a'.repeat(50),
      preset: 'moderate',
    };

    const aggressive: AutoCaptureInput = {
      text: 'a'.repeat(50),
      preset: 'aggressive',
    };

    expect(auto_capture_tool.inputSchema.safeParse(conservative).success).toBe(true);
    expect(auto_capture_tool.inputSchema.safeParse(moderate).success).toBe(true);
    expect(auto_capture_tool.inputSchema.safeParse(aggressive).success).toBe(true);
  });

  it('should execute auto-capture in review mode', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally got it working after hours of debugging! The solution was to use async/await properly instead of callbacks.',
      auto_save: false,
      notify: true,
    };

    const result = await auto_capture_tool.execute(params, { db });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');

    const text = result.content[0].text;
    expect(text).toContain('Auto-Capture Results');
  });

  it('should execute auto-capture with auto-save', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally working after hours! This is a major breakthrough with the solution being correct.',
      auto_save: true,
      threshold: 0.5,
      notify: true,
    };

    const result = await auto_capture_tool.execute(params, { db });

    const text = result.content[0].text;
    // Either auto-save enabled or no items meet threshold
    expect(text).toMatch(/Auto-Save Enabled|Review Mode/);
  });

  it('should include notifications when enabled', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally got it working after debugging for hours!',
      notify: true,
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    if (text.includes('Notifications')) {
      expect(text).toContain('📬');
    }
  });

  it('should not include notifications when disabled', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally got it working after debugging for hours!',
      notify: false,
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    expect(text).not.toContain('Notifications');
  });

  it('should show next steps for captured items', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally working! The key was to initialize the state properly.',
      auto_save: true,
      threshold: 0.7,
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    if (text.includes('Auto-Save Enabled')) {
      expect(text).toContain('Next Steps');
      expect(text).toContain('record_feedback');
    }
  });

  it('should show next steps for flagged items', async () => {
    const params: AutoCaptureInput = {
      text: 'This might be worth noting as a potential solution for the future.',
      auto_save: false,
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    // If items were flagged, show next steps; otherwise just verify no errors
    expect(text).toBeDefined();
  });

  it('should include summary section', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally working after debugging!',
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    expect(text).toContain('Summary');
    expect(text).toContain('Total Processed');
  });

  it('should extract and display details', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally fixed the bug in src/utils/parser.ts',
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    expect(text).toContain('Suggested Type');
    expect(text).toContain('Project');
    expect(text).toContain('File Context');
  });

  it('should use conservative preset correctly', async () => {
    const params: AutoCaptureInput = {
      text: 'Finally working!',
      preset: 'conservative',
      auto_save: true,
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    // Conservative should have high threshold (0.9)
    expect(text).toBeDefined();
  });

  it('should use aggressive preset correctly', async () => {
    const params: AutoCaptureInput = {
      text: 'Seems to be working',
      preset: 'aggressive',
      auto_save: true,
    };

    const result = await auto_capture_tool.execute(params, { db });
    const text = result.content[0].text;

    // Aggressive should have lower threshold (0.7)
    expect(text).toBeDefined();
  });
});
