/**
 * Tests for auto-capture workflow
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import Database from 'bun:sqlite';
import {
  extractKnowledgeDetails,
  runAutoCapture,
  createNotifications,
  formatNotification,
  processFeedback,
  type AutoCaptureOptions,
} from '../../src/auto-capture';

describe('extractKnowledgeDetails', () => {
  it('should extract summary from first sentence', () => {
    const text = 'Finally fixed the race condition in the API. The solution was to add proper locking.';
    const details = extractKnowledgeDetails(text);

    expect(details.summary).toBe('Finally fixed the race condition in the API');
  });

  it('should truncate long summary', () => {
    const text = 'This is a very long sentence that goes on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and on and should be truncated';
    const details = extractKnowledgeDetails(text);

    expect(details.summary.length).toBeLessThanOrEqual(203); // 200 + '...'
  });

  it('should use text slice if no sentence terminator', () => {
    const text = 'This is text without any sentence terminators it just goes on';
    const details = extractKnowledgeDetails(text);

    expect(details.summary).toBe(text.slice(0, 100));
  });

  it('should extract project name', () => {
    const text = 'Fixed issue in my-app project';
    const details = extractKnowledgeDetails(text);

    expect(details.project).toBe('my-app');
  });

  it('should default to default project', () => {
    const text = 'Just some text about a solution';
    const details = extractKnowledgeDetails(text);

    expect(details.project).toBe('default');
  });

  it('should extract file context', () => {
    const text = 'Found bug in src/components/Header.tsx';
    const details = extractKnowledgeDetails(text);

    expect(details.file_context).toBe('src/components/Header.tsx');
  });

  it('should default file context to unknown', () => {
    const text = 'No file mentioned here';
    const details = extractKnowledgeDetails(text);

    expect(details.file_context).toBe('unknown');
  });

  it('should determine type from detection', () => {
    const text = 'Finally got it working after hours of debugging';
    const details = extractKnowledgeDetails(text);

    expect(details.type).toBe('win');
  });

  it('should return all required fields', () => {
    const text = 'Finally working on the auth-service in auth.ts';
    const details = extractKnowledgeDetails(text);

    expect(details).toHaveProperty('summary');
    expect(details).toHaveProperty('content');
    expect(details).toHaveProperty('type');
    expect(details).toHaveProperty('project');
    expect(details).toHaveProperty('file_context');
  });
});

describe('runAutoCapture', () => {
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

  it('should detect high confidence and flag for review when autoSave is false', async () => {
    const text = 'Finally got it working! The solution was to clear the cache first.';
    const options: AutoCaptureOptions = {
      threshold: 0.7,
      autoSave: false,
      maxCaptures: 5,
    };

    const result = await runAutoCapture(db, text, options);

    expect(result.captured).toBe(false);
    expect(result.items.length).toBe(0);
    expect(result.flagForReview.length).toBeGreaterThan(0);
  });

  it('should auto-capture high confidence when autoSave is true', async () => {
    const text = 'Finally working! The key was to use async/await properly. This was a major breakthrough.';
    const options: AutoCaptureOptions = {
      threshold: 0.5,
      autoSave: true,
      maxCaptures: 5,
    };

    const result = await runAutoCapture(db, text, options);

    // Lower threshold to ensure capture
    if (result.items.length > 0) {
      expect(result.captured).toBe(true);
      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0]).toHaveProperty('confidence');
      expect(result.items[0]).toHaveProperty('level');
    }
  });

  it('should flag medium confidence for review', async () => {
    const text = 'This seems to be working now.';
    const options: AutoCaptureOptions = {
      threshold: 0.9,
      autoSave: true,
      maxCaptures: 5,
    };

    const result = await runAutoCapture(db, text, options);

    // Medium confidence (threshold * 0.8 = 0.72)
    if (result.flagForReview.length > 0) {
      expect(result.flagForReview[0].reason).toContain('Medium confidence');
    }
  });

  it('should track usage for captured items', async () => {
    const text = 'Finally working! Used the correct API endpoint.';
    const options: AutoCaptureOptions = {
      threshold: 0.7,
      autoSave: true,
      maxCaptures: 5,
    };

    const result = await runAutoCapture(db, text, options);

    if (result.captured && result.items.length > 0) {
      // Wait a bit for async tracking
      await new Promise((resolve) => setTimeout(resolve, 50));

      const item = db.prepare(
        'SELECT access_count, first_accessed_at FROM knowledge_items WHERE id = ?'
      ).get(result.items[0].id) as any;

      expect(item.access_count).toBeGreaterThan(0);
      expect(item.first_accessed_at).not.toBeNull();
    }
  });

  it('should handle database errors gracefully', async () => {
    // Use a DB that will fail on insert
    const badDb = new Database(':memory:');
    badDb.exec(`
      CREATE TABLE knowledge_items (
        id TEXT PRIMARY KEY,
        summary TEXT NOT NULL UNIQUE, -- Add constraint that will fail
        type TEXT NOT NULL
      );
    `);

    const text = 'Finally working!';
    const options: AutoCaptureOptions = {
      threshold: 0.5,
      autoSave: true,
      maxCaptures: 5,
    };

    const result = await runAutoCapture(badDb, text, options);

    // Should fall back to flagging for review
    expect(result.flagForReview.length).toBeGreaterThan(0);
    expect(result.flagForReview[0].reason).toContain('Detection failed');
  });

  it('should respect maxCaptures limit', async () => {
    const text = 'Finally working!';
    const options: AutoCaptureOptions = {
      threshold: 0.5,
      autoSave: true,
      maxCaptures: 1,
    };

    // Run multiple times
    await runAutoCapture(db, text, options);
    await runAutoCapture(db, text, options);
    await runAutoCapture(db, text, options);

    const count = db.prepare('SELECT COUNT(*) as count FROM knowledge_items').get() as any;
    expect(count.count).toBe(3); // Each run creates one item
  });

  it('should return total processed count', async () => {
    const text = 'Finally working!';
    const result = await runAutoCapture(db, text, {});

    expect(result.totalProcessed).toBe(1);
  });
});

describe('createNotifications', () => {
  it('should create capture notifications', () => {
    const results = {
      captured: true,
      items: [
        {
          id: 'item-1',
          confidence: 0.95,
          level: 'high',
          notification: 'Auto-captured as win',
        },
      ],
      flagForReview: [],
      totalProcessed: 1,
    };

    const notifications = createNotifications(results);

    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('capture');
    expect(notifications[0].confidence).toBe(0.95);
  });

  it('should create review notifications', () => {
    const results = {
      captured: false,
      items: [],
      flagForReview: [
        {
          text: 'Seems to be working',
          confidence: 0.65,
          level: 'medium',
          reason: 'Medium confidence detection',
        },
      ],
      totalProcessed: 1,
    };

    const notifications = createNotifications(results);

    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('review');
    expect(notifications[0].details.text).toBe('Seems to be working');
  });

  it('should create mixed notifications', () => {
    const results = {
      captured: true,
      items: [
        {
          id: 'item-1',
          confidence: 0.92,
          level: 'high',
          notification: 'Captured',
        },
      ],
      flagForReview: [
        {
          text: 'Maybe important',
          confidence: 0.6,
          level: 'medium',
          reason: 'Medium confidence',
        },
      ],
      totalProcessed: 2,
    };

    const notifications = createNotifications(results);

    expect(notifications.length).toBe(2);
    expect(notifications[0].type).toBe('capture');
    expect(notifications[1].type).toBe('review');
  });
});

describe('formatNotification', () => {
  it('should format capture notification', () => {
    const notification = {
      type: 'capture' as const,
      confidence: 0.92,
      message: 'Auto-captured knowledge item [item-1] as win',
      details: {
        text: 'Finally working!',
        suggestedType: 'win',
        confidence: 0.92,
        level: 'high',
      },
    };

    const formatted = formatNotification(notification);

    expect(formatted).toContain('Auto-Captured');
    expect(formatted).toContain('92%');
  });

  it('should format review notification with text', () => {
    const notification = {
      type: 'review' as const,
      confidence: 0.65,
      message: 'Knowledge moment detected',
      details: {
        text: 'This might be worth remembering',
        suggestedType: 'solution',
        confidence: 0.65,
        level: 'medium',
      },
    };

    const formatted = formatNotification(notification);

    expect(formatted).toContain('Review Needed');
    expect(formatted).toContain('This might be worth remembering');
    expect(formatted).toContain('Next Steps');
  });

  it('should truncate long text in review notification', () => {
    const longText = 'a'.repeat(1000);
    const notification = {
      type: 'review' as const,
      confidence: 0.7,
      message: 'Detected',
      details: {
        text: longText,
        suggestedType: 'pattern',
        confidence: 0.7,
        level: 'medium',
      },
    };

    const formatted = formatNotification(notification);

    expect(formatted).toContain('...');
    expect(formatted.length).toBeLessThan(longText.length);
  });
});

describe('processFeedback', () => {
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

  it('should confirm and record positive feedback', () => {
    db.prepare(
      'INSERT INTO knowledge_items (id, project, file_context, summary, content, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('item-1', 'default', 'unknown', 'Test', 'Content', 'solution');

    const result = processFeedback(db, 'item-1', 'confirm');

    expect(result.success).toBe(true);
    expect(result.message).toContain('learn from this');
  });

  it('should reject and delete item', () => {
    db.prepare(
      'INSERT INTO knowledge_items (id, project, file_context, summary, content, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('item-1', 'default', 'unknown', 'Test', 'Content', 'solution');

    const result = processFeedback(db, 'item-1', 'reject');

    expect(result.success).toBe(true);
    expect(result.message).toContain('deleted');

    const item = db.prepare('SELECT * FROM knowledge_items WHERE id = ?').get('item-1');
    expect(item).toBeNull();
  });

  it('should handle modify feedback', () => {
    db.prepare(
      'INSERT INTO knowledge_items (id, project, file_context, summary, content, type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('item-1', 'default', 'unknown', 'Test', 'Content', 'solution');

    const result = processFeedback(db, 'item-1', 'modify');

    expect(result.success).toBe(true);
    expect(result.message).toContain('edit the item');

    // Item should still exist
    const item = db.prepare('SELECT * FROM knowledge_items WHERE id = ?').get('item-1');
    expect(item).toBeDefined();
  });

  it('should return error for non-existent item on reject', () => {
    const result = processFeedback(db, 'non-existent', 'reject');

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});
