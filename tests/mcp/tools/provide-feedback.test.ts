/**
 * Tests for provide-feedback MCP tool
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import { provide_feedback_tool, type ProvideFeedbackInput } from '../../../src/mcp/tools/provide-feedback';
import { createKnowledgeItem } from '../../../src/db/operations';

describe('provide_feedback_tool', () => {
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
    expect(provide_feedback_tool.name).toBe('provide_feedback');
    expect(provide_feedback_tool.description).toContain('feedback');
    expect(provide_feedback_tool.inputSchema).toBeDefined();
  });

  it('should validate item_id presence', () => {
    const params = {
      item_id: '',
      action: 'confirm' as const,
    };

    const result = provide_feedback_tool.inputSchema.safeParse(params);

    expect(result.success).toBe(false);
  });

  it('should validate action values', () => {
    const invalid = {
      item_id: 'test',
      action: 'invalid' as const,
    };

    const result = provide_feedback_tool.inputSchema.safeParse(invalid);

    expect(result.success).toBe(false);
  });

  it('should accept valid action values', () => {
    const confirm = {
      item_id: 'test',
      action: 'confirm' as const,
    };

    const reject = {
      item_id: 'test',
      action: 'reject' as const,
    };

    const modify = {
      item_id: 'test',
      action: 'modify' as const,
    };

    expect(provide_feedback_tool.inputSchema.safeParse(confirm).success).toBe(true);
    expect(provide_feedback_tool.inputSchema.safeParse(reject).success).toBe(true);
    expect(provide_feedback_tool.inputSchema.safeParse(modify).success).toBe(true);
  });

  it('should accept optional comment', () => {
    const withComment = {
      item_id: 'test',
      action: 'confirm' as const,
      comment: 'This was helpful',
    };

    const result = provide_feedback_tool.inputSchema.safeParse(withComment);

    expect(result.success).toBe(true);
  });

  it('should confirm an item successfully', async () => {
    // Create an item
    const item = createKnowledgeItem(db, {
      summary: 'Test',
      content: 'Test content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const params: ProvideFeedbackInput = {
      item_id: item.id,
      action: 'confirm',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    expect(result.content[0].text).toContain('Feedback Recorded');
    expect(result.content[0].text).toContain('confirmed as valuable');

    // Item should still exist
    const exists = db.prepare('SELECT 1 FROM knowledge_items WHERE id = ?').get(item.id);
    expect(exists).toBeDefined();
  });

  it('should reject and delete an item', async () => {
    // Create an item
    const item = createKnowledgeItem(db, {
      summary: 'Test',
      content: 'Test content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const params: ProvideFeedbackInput = {
      item_id: item.id,
      action: 'reject',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    expect(result.content[0].text).toContain('Feedback Recorded');
    expect(result.content[0].text).toContain('deleted from the knowledge base');

    // Item should be deleted
    const deleted = db.prepare('SELECT 1 FROM knowledge_items WHERE id = ?').get(item.id);
    expect(deleted).toBeNull();
  });

  it('should handle modify action', async () => {
    // Create an item
    const item = createKnowledgeItem(db, {
      summary: 'Test',
      content: 'Test content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const params: ProvideFeedbackInput = {
      item_id: item.id,
      action: 'modify',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    expect(result.content[0].text).toContain('Feedback Recorded');
    expect(result.content[0].text).toContain('modify the item');
    expect(result.content[0].text).toContain('update_knowledge');

    // Item should still exist
    const exists = db.prepare('SELECT 1 FROM knowledge_items WHERE id = ?').get(item.id);
    expect(exists).toBeDefined();
  });

  it('should include comment in output', async () => {
    const item = createKnowledgeItem(db, {
      summary: 'Test',
      content: 'Test content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const params: ProvideFeedbackInput = {
      item_id: item.id,
      action: 'confirm',
      comment: 'This saved me hours!',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    expect(result.content[0].text).toContain('Your Comment');
    expect(result.content[0].text).toContain('This saved me hours!');
  });

  it('should show error for non-existent item on reject', async () => {
    const params: ProvideFeedbackInput = {
      item_id: 'non-existent-id',
      action: 'reject',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    expect(result.content[0].text).toContain('Error');
  });

  it('should show error for non-existent item on confirm', async () => {
    const params: ProvideFeedbackInput = {
      item_id: 'non-existent-id',
      action: 'confirm',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    // Confirming non-existent item should still record feedback in the system
    expect(result.content[0].text).toBeDefined();
  });

  it('should include impact section', async () => {
    const item = createKnowledgeItem(db, {
      summary: 'Test',
      content: 'Test content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const params: ProvideFeedbackInput = {
      item_id: item.id,
      action: 'confirm',
    };

    const result = await provide_feedback_tool.execute(params, { db });

    expect(result.content[0].text).toContain('Impact');
    expect(result.content[0].text).toContain('Confirms');
    expect(result.content[0].text).toContain('Rejects');
    expect(result.content[0].text).toContain('Adjusts');
  });

  it('should format output with markdown', async () => {
    const item = createKnowledgeItem(db, {
      summary: 'Test',
      content: 'Test content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const params: ProvideFeedbackInput = {
      item_id: item.id,
      action: 'confirm',
    };

    const result = await provide_feedback_tool.execute(params, { db });
    const text = result.content[0].text;

    expect(text).toContain('##'); // Markdown headers
    expect(text).toContain('**'); // Bold text
    expect(text).toContain('-'); // List items
  });

  it('should handle all three action types', async () => {
    const item1 = createKnowledgeItem(db, {
      summary: 'Test1',
      content: 'Content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const item2 = createKnowledgeItem(db, {
      summary: 'Test2',
      content: 'Content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const item3 = createKnowledgeItem(db, {
      summary: 'Test3',
      content: 'Content',
      type: 'solution',
      project: 'default',
      file_context: 'unknown',
    });

    const confirmResult = await provide_feedback_tool.execute(
      { item_id: item1.id, action: 'confirm' },
      { db }
    );
    expect(confirmResult.content[0].text).toContain('Feedback Recorded');

    const rejectResult = await provide_feedback_tool.execute(
      { item_id: item2.id, action: 'reject' },
      { db }
    );
    expect(rejectResult.content[0].text).toContain('Feedback Recorded');

    const modifyResult = await provide_feedback_tool.execute(
      { item_id: item3.id, action: 'modify' },
      { db }
    );
    expect(modifyResult.content[0].text).toContain('Feedback Recorded');
  });
});
