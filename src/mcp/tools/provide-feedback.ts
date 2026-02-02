import { z } from 'zod';
import type Database from 'bun:sqlite';
import { processFeedback } from '../../auto-capture';

/**
 * Input schema for feedback tool
 */
export const ProvideFeedbackInputSchema = z.object({
  item_id: z.string().min(1, 'Item ID is required'),
  action: z.enum(['confirm', 'reject', 'modify']),
  comment: z.string().optional(),
});

export type ProvideFeedbackInput = z.infer<typeof ProvideFeedbackInputSchema>;

/**
 * Feedback tool implementation
 */
export const provide_feedback_tool = {
  name: 'provide_feedback',
  description:
    'Provide feedback on auto-captured or detected knowledge items. ' +
    'Confirm valuable items to help the system learn. ' +
    'Reject noise to reduce false positives.',
  inputSchema: ProvideFeedbackInputSchema,

  async execute(
    params: ProvideFeedbackInput,
    context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = processFeedback(context.db, params.item_id, params.action);

    const lines: string[] = [];

    if (result.success) {
      lines.push('## ✅ Feedback Recorded');
      lines.push('');
      lines.push(result.message);
      lines.push('');

      if (params.action === 'confirm') {
        lines.push('The item has been confirmed as valuable.');
      } else if (params.action === 'reject') {
        lines.push('The item has been deleted from the knowledge base.');
      } else if (params.action === 'modify') {
        lines.push('You can now modify the item using update_knowledge.');
      }

      if (params.comment) {
        lines.push('');
        lines.push(`**Your Comment:** ${params.comment}`);
      }
    } else {
      lines.push('## ❌ Error');
      lines.push('');
      lines.push(result.message);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('### 💡 Impact');
    lines.push('');
    lines.push('Your feedback helps improve the detection system:');
    lines.push('- **Confirms**: Which patterns/sentiments indicate valuable knowledge');
    lines.push('- **Rejects**: Which detections are noise or false positives');
    lines.push('- **Adjusts**: Weights are tuned based on feedback over time');

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
