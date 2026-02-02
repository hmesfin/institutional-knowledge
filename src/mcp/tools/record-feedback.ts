import { z } from 'zod';
import type Database from 'bun:sqlite';
import { recordFeedback, getFeedbackStats } from '../../confidence';
import type { FeedbackEntry } from '../../confidence';

/**
 * Input schema for record_feedback tool
 */
export const RecordFeedbackInputSchema = z.object({
  detection_id: z.string().min(1, 'Detection ID is required'),
  feedback: z.enum(['confirm', 'reject']),
  confidence: z.number().min(0).max(1, 'Confidence score must be between 0 and 1'),
  factors: z.array(z.string()).optional(),
});

export type RecordFeedbackInput = z.infer<typeof RecordFeedbackInputSchema>;

/**
 * Feedback recording tool implementation
 */
export const record_feedback_tool = {
  name: 'record_feedback',
  description:
    'Record user feedback for confidence scoring. ' +
    'Helps the system learn which detections are valuable over time. ' +
    'Use "confirm" for good detections and "reject" for noise/false positives.',
  inputSchema: RecordFeedbackInputSchema,

  async execute(
    params: RecordFeedbackInput,
    _context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Create feedback entry
    const entry: FeedbackEntry = {
      id: params.detection_id,
      feedback: params.feedback,
      confidence: params.confidence,
      factors: params.factors || [],
      timestamp: Date.now(),
    };

    // Record feedback
    recordFeedback(entry);

    // Get updated statistics
    const stats = getFeedbackStats();

    // Format output
    const lines: string[] = [];

    lines.push('## Feedback Recorded');
    lines.push('');
    lines.push(`**Detection ID:** ${params.detection_id}`);
    lines.push(`**Feedback:** ${params.feedback.toUpperCase()}`);
    lines.push(`**Confidence:** ${(params.confidence * 100).toFixed(0)}%`);
    lines.push('');

    if (params.factors && params.factors.length > 0) {
      lines.push('**Factors:**');
      params.factors.forEach((factor) => {
        lines.push(`- ${factor}`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('### 📊 Feedback Statistics');
    lines.push('');
    lines.push(`**Total Feedback Entries:** ${stats.total}`);
    lines.push(`**Confirmed:** ${stats.confirmed}`);
    lines.push(`**Rejected:** ${stats.rejected}`);
    lines.push(`**Confirmation Rate:** ${(stats.confirmationRate * 100).toFixed(0)}%`);
    lines.push('');

    if (stats.total > 0) {
      lines.push('**Average Confidence:**');
      lines.push(`- Confirmed items: ${(stats.avgConfidence.confirmed * 100).toFixed(0)}%`);
      lines.push(`- Rejected items: ${(stats.avgConfidence.rejected * 100).toFixed(0)}%`);
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
