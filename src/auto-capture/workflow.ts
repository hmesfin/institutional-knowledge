/**
 * Auto-capture workflow service
 *
 * End-to-end workflow for detecting and capturing knowledge moments
 */

import type Database from 'bun:sqlite';
import { createKnowledgeItem } from '../db/operations';
import { detectWithSentiment } from '../detection';
import { scoreConfidence } from '../confidence';
import type { ScoringOptions } from '../confidence';

export interface AutoCaptureOptions {
  /** Minimum confidence to trigger auto-capture (default: 0.9) */
  threshold?: number;
  /** Whether to auto-save or just flag for review (default: false) */
  autoSave?: boolean;
  /** Whether to notify user (default: true) */
  notify?: boolean;
  /** Optional scoring options */
  scoringOptions?: ScoringOptions;
  /** Maximum items to capture in one run (default: 5) */
  maxCaptures?: number;
}

export interface AutoCaptureResult {
  /** Whether any captures were made */
  captured: boolean;
  /** Items that were captured */
  items: Array<{
    id: string;
    confidence: number;
    level: string;
    notification: string;
  }>;
  /** Items flagged for review but not captured */
  flagForReview: Array<{
    text: string;
    confidence: number;
    level: string;
    reason: string;
  }>;
  /** Total items processed */
  totalProcessed: number;
}

export interface Notification {
  type: 'capture' | 'review';
  confidence: number;
  message: string;
  details: {
    text: string;
    suggestedType: string;
    confidence: number;
    level: string;
  };
}

/**
 * Extract knowledge item details from detected text
 */
export function extractKnowledgeDetails(text: string): {
  summary: string;
  content: string;
  type: 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting';
  project: string;
  file_context: string;
} {
  // Extract summary (first sentence or first 100 chars)
  const sentences = text.split(/[.!?]+/);
  let summary = sentences[0]?.trim() || text.slice(0, 100);
  if (summary.length > 200) {
    summary = summary.slice(0, 200) + '...';
  }

  // Determine type from detection
  const detection = detectWithSentiment(text);
  const type = detection.suggestedType || 'solution';

  // Extract project from text if mentioned
  const projectMatch = text.match(/(?:in|for|project)\s+["']?([a-zA-Z0-9_-]+)/i);
  const project = projectMatch?.[1] || 'default';

  // Extract file context if mentioned (require file extension for better matching)
  const fileMatch = text.match(/(?:file|in|at)\s+["']?([a-zA-Z0-9_/.]+\.[a-zA-Z0-9_/.]+)/i);
  const file_context = fileMatch?.[1] || 'unknown';

  return {
    summary,
    content: text,
    type,
    project,
    file_context,
  };
}

/**
 * Run auto-capture workflow on text
 */
export async function runAutoCapture(
  db: Database,
  text: string,
  options: AutoCaptureOptions = {}
): Promise<AutoCaptureResult> {
  const {
    threshold = 0.9,
    autoSave = false,
    scoringOptions = {},
  } = options;

  // Detect patterns and sentiment
  const detection = detectWithSentiment(text);

  // Score confidence
  const confidence = scoreConfidence(text, detection, scoringOptions);

  const results: AutoCaptureResult = {
    captured: false,
    items: [],
    flagForReview: [],
    totalProcessed: 1,
  };

  // High confidence - auto-capture
  if (confidence.score >= threshold) {
    const details = extractKnowledgeDetails(text);

    try {
      if (autoSave) {
        // Auto-save to database
        const item = createKnowledgeItem(db, {
          ...details,
          tags: ['auto-captured'],
          solution_verified: false,
        });

        results.captured = true;
        results.items.push({
          id: item.id,
          confidence: confidence.score,
          level: confidence.level,
          notification: `Auto-captured as ${details.type} (${confidence.level})`,
        });

        // Track usage for the captured item
        const { trackItemAccess } = await import('../db/operations');
        setImmediate(() => {
          try {
            trackItemAccess(db, item.id);
          } catch (error) {
            // Silently fail
          }
        });
      } else {
        // Flag for review
        results.flagForReview.push({
          text,
          confidence: confidence.score,
          level: confidence.level,
          reason: `High confidence detection (${confidence.level}) - requires review`,
        });
      }
    } catch (error) {
      results.flagForReview.push({
        text,
        confidence: confidence.score,
        level: confidence.level,
        reason: `Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
  // Medium confidence - flag for potential review
  else if (confidence.score >= (threshold * 0.8)) {
    results.flagForReview.push({
      text,
      confidence: confidence.score,
      level: confidence.level,
      reason: `Medium confidence detection - may be worth reviewing`,
    });
  }

  return results;
}

/**
 * Create notifications for auto-capture results
 */
export function createNotifications(results: AutoCaptureResult): Notification[] {
  const notifications: Notification[] = [];

  // Notifications for captured items
  for (const item of results.items) {
    const details = extractKnowledgeDetails('');

    notifications.push({
      type: 'capture',
      confidence: item.confidence,
      message: `✅ Auto-captured knowledge item [${item.id}] as ${details.type}`,
      details: {
        text: '', // Will be filled by actual text
        suggestedType: details.type,
        confidence: item.confidence,
        level: item.level,
      },
    });
  }

  // Notifications for items flagged for review
  for (const item of results.flagForReview) {
    const details = extractKnowledgeDetails(item.text);

    notifications.push({
      type: 'review',
      confidence: item.confidence,
      message: `⚠️ Knowledge moment detected (${item.level} confidence) - needs review`,
      details: {
        text: item.text,
        suggestedType: details.type,
        confidence: item.confidence,
        level: item.level,
      },
    });
  }

  return notifications;
}

/**
 * Format notification for display
 */
export function formatNotification(notification: Notification): string {
  const lines: string[] = [];

  lines.push(`## ${notification.type === 'capture' ? '📥 Auto-Captured' : '👀 Review Needed'}`);
  lines.push('');
  lines.push(`**Confidence:** ${(notification.confidence * 100).toFixed(0)}%`);
  lines.push('');
  lines.push(`**Message:** ${notification.message}`);
  lines.push('');

  if (notification.details.text) {
    lines.push('**Detected Text:**');
    lines.push('```');
    lines.push(notification.details.text.slice(0, 500));
    if (notification.details.text.length > 500) {
      lines.push('...');
    }
    lines.push('```');
    lines.push('');
  }

  if (notification.type === 'review') {
    lines.push('**Suggested Type:** ' + notification.details.suggestedType);
    lines.push('');
    lines.push('### Next Steps');
    lines.push('');
    lines.push('1. Review the detected text above');
    lines.push('2. If valuable, capture with `capture_knowledge`');
    lines.push('3. Provide feedback to improve detection');
    lines.push('');
    lines.push('**Feedback:**');
    lines.push('- Use `record_feedback` to mark as helpful or noise');
  }

  return lines.join('\n');
}

/**
 * Process user feedback on auto-capture
 */
export function processFeedback(
  db: Database,
  itemId: string,
  feedback: 'confirm' | 'reject' | 'modify'
): { success: boolean; message: string } {
  const { recordFeedback } = require('../confidence');

  try {
    // If reject, delete the auto-captured item
    if (feedback === 'reject') {
      const { deleteKnowledgeItem } = require('../db/operations');
      const deleted = deleteKnowledgeItem(db, itemId);

      if (deleted) {
        // Record feedback
        recordFeedback({
          id: itemId,
          feedback: 'reject',
          confidence: 0.5, // Default confidence for feedback
          factors: ['auto-capture'],
          timestamp: Date.now(),
        });

        return {
          success: true,
          message: 'Item deleted and feedback recorded. Detection system will learn from this.',
        };
      } else {
        return {
          success: false,
          message: 'Item not found or could not be deleted.',
        };
      }
    }

    // If confirm, record positive feedback
    if (feedback === 'confirm') {
      recordFeedback({
        id: itemId,
        feedback: 'confirm',
        confidence: 0.9,
        factors: ['auto-capture', 'user-confirmed'],
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: 'Feedback recorded. Detection system will learn from this.',
      };
    }

    // If modify, user will edit the item manually
    if (feedback === 'modify') {
      recordFeedback({
        id: itemId,
        feedback: 'confirm', // Treat modify as confirm with adjustment
        confidence: 0.8,
        factors: ['auto-capture', 'user-modified'],
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: 'Feedback recorded. You can now edit the item. Detection system will learn from your adjustments.',
      };
    }

    return {
      success: false,
      message: 'Invalid feedback action.',
    };
  } catch (error) {
    return {
      success: false,
      message: `Error processing feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
