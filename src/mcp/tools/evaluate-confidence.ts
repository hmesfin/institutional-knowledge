import { z } from 'zod';
import type Database from 'bun:sqlite';
import {
  scoreConfidence,
  filterByConfidence,
  getRecommendedAction,
  THRESHOLD_PRESETS,
} from '../../confidence';
import { detectWithSentiment } from '../../detection';

/**
 * Input schema for evaluate_confidence tool
 */
export const EvaluateConfidenceInputSchema = z.object({
  text: z.string().min(20, 'Text must be at least 20 characters'),
  preset: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  custom_high_threshold: z.number().min(0).max(1).optional(),
  custom_medium_threshold: z.number().min(0).max(1).optional(),
  custom_low_threshold: z.number().min(0).max(1).optional(),
  include_factors: z.boolean().optional(),
  apply_threshold: z.boolean().optional(),
  adjust_weights: z.boolean().optional(),
});

export type EvaluateConfidenceInput = z.infer<typeof EvaluateConfidenceInputSchema>;

/**
 * Format confidence score for display
 */
function formatConfidenceScore(
  confidence: ReturnType<typeof scoreConfidence>,
  includeFactors: boolean = true
): string {
  const lines: string[] = [];

  lines.push('## Confidence Analysis');
  lines.push('');

  // Overall score with level
  const levelEmoji =
    confidence.level === 'very-high'
      ? '🎯'
      : confidence.level === 'high'
        ? '✅'
        : confidence.level === 'medium'
          ? '⚠️'
          : confidence.level === 'low'
            ? '❓'
            : '❌';

  lines.push(`${levelEmoji} **Overall Confidence:** ${(confidence.score * 100).toFixed(0)}%`);
  lines.push(`**Level:** ${confidence.level}`);
  lines.push(`**Meets Threshold:** ${confidence.meetsThreshold ? 'Yes' : 'No'}`);
  lines.push('');

  // Reasoning
  if (confidence.reasoning.length > 0) {
    lines.push('### Analysis');
    lines.push('');
    confidence.reasoning.forEach((reason) => {
      lines.push(`- ${reason}`);
    });
    lines.push('');
  }

  // Individual factors
  if (includeFactors && confidence.factors.length > 0) {
    lines.push('### Confidence Factors');
    lines.push('');
    lines.push('| Factor | Weight | Score | Contribution |');
    lines.push('|--------|--------|-------|-------------|');

    confidence.factors.forEach((factor) => {
      lines.push(
        `| ${factor.name} | ${(factor.weight * 100).toFixed(0)}% | ${(factor.value * 100).toFixed(0)}% | ${(factor.contribution * 100).toFixed(0)}% | ${factor.explanation} |`
      );
    });
    lines.push('');
  }

  // Recommendation
  const action = getRecommendedAction(confidence);
  lines.push('### 💡 Recommendation');
  lines.push('');
  const actionEmoji =
    action.action === 'capture'
      ? '📥'
      : action.action === 'review'
        ? '👀'
        : '🚫';

  lines.push(`${actionEmoji} **Action:** ${action.action.toUpperCase()}`);
  lines.push(`**Reason:** ${action.reason}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Confidence evaluation tool implementation
 */
export const evaluate_confidence_tool = {
  name: 'evaluate_confidence',
  description:
    'Evaluate confidence score for knowledge detection. ' +
    'Multi-factor scoring with tunable thresholds and detailed factor analysis. ' +
    'Helps separate valuable knowledge from noise.',
  inputSchema: EvaluateConfidenceInputSchema,

  async execute(
    params: EvaluateConfidenceInput,
    _context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Detect patterns and sentiment
    const detection = detectWithSentiment(params.text, {
      requireBoth: false,
    });

    // Build options
    const options: Parameters<typeof scoreConfidence>[2] = {};

    if (params.preset) {
      options.thresholds = THRESHOLD_PRESETS[params.preset];
    }

    if (params.custom_high_threshold !== undefined) {
      options.thresholds = {
        ...options.thresholds,
        high: params.custom_high_threshold,
      };
    }

    if (params.custom_medium_threshold !== undefined) {
      options.thresholds = {
        ...options.thresholds,
        medium: params.custom_medium_threshold,
      };
    }

    if (params.custom_low_threshold !== undefined) {
      options.thresholds = {
        ...options.thresholds,
        low: params.custom_low_threshold,
      };
    }

    // Score confidence
    const confidence = scoreConfidence(params.text, detection, options);

    // Apply threshold filter if requested
    let filterResult;
    if (params.apply_threshold) {
      filterResult = filterByConfidence(params.text, detection, options);
    }

    // Format output
    let formatted = formatConfidenceScore(confidence, params.include_factors ?? true);

    // Add filter result if applicable
    if (filterResult) {
      formatted += '\n---\n\n';
      if (filterResult.passes) {
        formatted += '✅ **Passes Confidence Threshold**\n\n';
      } else {
        formatted += '❌ **Below Confidence Threshold**\n\n';
        if (filterResult.reason) {
          formatted += `**Reason:** ${filterResult.reason}\n\n`;
        }
      }
    }

    // Add weight adjustment info if requested
    if (params.adjust_weights) {
      formatted += '---\n\n';
      formatted += '### 📊 Weight Adjustment\n\n';
      formatted +=
        'Weight adjustment feature allows the system to learn from feedback over time.\n\n';
      formatted += '**Current Weights:**\n';
      formatted += '- Pattern: 35%\n';
      formatted += '- Sentiment: 30%\n';
      formatted += '- Text Length: 15%\n';
      formatted += '- Structure: 20%\n\n';
      formatted +=
        'To enable learning, use the record_feedback tool with confirm/reject actions.\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    };
  },
};
