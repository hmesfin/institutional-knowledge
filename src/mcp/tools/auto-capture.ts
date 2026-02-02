import { z } from 'zod';
import type Database from 'bun:sqlite';
import {
  runAutoCapture,
  createNotifications,
  formatNotification,
  extractKnowledgeDetails,
} from '../../auto-capture';
import type { AutoCaptureOptions } from '../../auto-capture';

/**
 * Input schema for auto_capture tool
 */
export const AutoCaptureInputSchema = z.object({
  text: z.string().min(50, 'Text must be at least 50 characters'),
  threshold: z.number().min(0).max(1).optional(),
  auto_save: z.boolean().optional(),
  notify: z.boolean().optional(),
  preset: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  max_captures: z.number().int().min(1).max(10).optional(),
});

export type AutoCaptureInput = z.infer<typeof AutoCaptureInputSchema>;

/**
 * Auto-capture tool implementation
 */
export const auto_capture_tool = {
  name: 'auto_capture',
  description:
    'Run end-to-end auto-capture workflow. ' +
    'Detects knowledge moments, evaluates confidence, and optionally auto-saves high-confidence items. ' +
    'Provides notifications and feedback mechanisms for continuous improvement.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: {
        type: 'string' as const,
        description: 'Text to analyze for auto-capture',
      },
      threshold: {
        type: 'number' as const,
        description: 'Confidence threshold for auto-capture (0-1, default: 0.9)',
        minimum: 0,
        maximum: 1,
      },
      auto_save: {
        type: 'boolean' as const,
        description: 'Automatically save items above threshold (optional, default: false)',
      },
      notify: {
        type: 'boolean' as const,
        description: 'Show notifications (optional, default: true)',
      },
      preset: {
        type: 'string' as const,
        enum: ['conservative', 'moderate', 'aggressive'],
        description: 'Use preset confidence thresholds (optional)',
      },
      max_captures: {
        type: 'number' as const,
        description: 'Maximum items to capture (default: 5, max: 10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: ['text'] as const,
  },

  async execute(
    params: AutoCaptureInput,
    context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Build options
    const options: AutoCaptureOptions = {
      threshold: params.threshold ?? 0.9,
      autoSave: params.auto_save ?? false,
      notify: params.notify ?? true,
      maxCaptures: params.max_captures ?? 5,
      scoringOptions: params.preset
        ? {
            thresholds:
              params.preset === 'conservative'
                ? { high: 0.9, medium: 0.7, low: 0.5 }
                : params.preset === 'moderate'
                  ? { high: 0.8, medium: 0.6, low: 0.4 }
                  : { high: 0.7, medium: 0.5, low: 0.3 },
          }
        : undefined,
    };

    // Extract details for information
    const details = extractKnowledgeDetails(params.text);

    // Run auto-capture workflow
    const results = await runAutoCapture(context.db, params.text, options);

    // Create notifications
    const notifications = createNotifications(results);

    // Format output
    const lines: string[] = [];

    lines.push('## Auto-Capture Results');
    lines.push('');
    lines.push(`**Text Length:** ${params.text.length} characters`);
    lines.push(`**Suggested Type:** ${details.type}`);
    lines.push(`**Project:** ${details.project}`);
    lines.push(`**File Context:** ${details.file_context}`);
    lines.push('');

    // Auto-save status
    if (params.auto_save && results.captured) {
      lines.push('✅ **Auto-Save Enabled**');
      lines.push(`Auto-captured ${results.items.length} item(s) with confidence >= ${options.threshold}`);
      lines.push('');
    } else {
      lines.push('ℹ️ **Review Mode** (auto_save=false)');
      lines.push('Items flagged for review only, not saved');
      lines.push('');
    }

    // Captured items
    if (results.items.length > 0) {
      lines.push('### Auto-Captured Items');
      lines.push('');
      results.items.forEach((item, i) => {
        lines.push(
          `${i + 1}. Item ID: ${item.id} (${item.level}, ${(item.confidence * 100).toFixed(0)}% confidence)`
        );
      });
      lines.push('');
    }

    // Flagged for review
    if (results.flagForReview.length > 0) {
      lines.push('### Flagged for Review');
      lines.push('');
      results.flagForReview.forEach((item, i) => {
        lines.push(
          `${i + 1}. Confidence: ${(item.confidence * 100).toFixed(0)}% (${item.level})`
        );
        lines.push(`   ${item.reason}`);
        lines.push(`   Text: "${item.text.slice(0, 100)}..."`);
      });
      lines.push('');
    }

    // Summary
    lines.push('---');
    lines.push('');
    lines.push('### Summary');
    lines.push('');
    lines.push(`- Total Processed: ${results.totalProcessed}`);
    lines.push(`- Captured: ${results.items.length}`);
    lines.push(`- Flagged for Review: ${results.flagForReview.length}`);
    lines.push('');

    // Notifications
    if (notifications.length > 0 && params.notify) {
      lines.push('### 📬 Notifications');
      lines.push('');
      notifications.forEach((notification, i) => {
        lines.push(`**${i + 1}. ${notification.type.toUpperCase()}**`);
        lines.push(formatNotification(notification));
        lines.push('');
      });
    }

    // Next steps
    if (results.captured) {
      lines.push('### 📋 Next Steps');
      lines.push('');
      lines.push('Auto-captured items are now in the knowledge base.');
      lines.push('');
      lines.push('To provide feedback:');
      lines.push('1. Review captured items');
      lines.push('2. Use `record_feedback` with the item ID');
      lines.push('3. Mark as "confirm" (valuable) or "reject" (noise)');
      lines.push('');
    } else if (results.flagForReview.length > 0) {
      lines.push('### 📋 Next Steps');
      lines.push('');
      lines.push('Items are flagged for manual review.');
      lines.push('');
      lines.push('To capture:');
      lines.push('1. Use `capture_knowledge` with the extracted details');
      lines.push('   - summary: ' + details.summary);
      lines.push('   - content: [full text]');
      lines.push('   - type: ' + details.type);
      lines.push('   - project: ' + details.project);
      lines.push('2. Use `record_feedback` to improve detection');
      lines.push('');
    }

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n'),
        },
      ],
    };
  },
};
