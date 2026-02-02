import { z } from 'zod';
import type Database from 'bun:sqlite';
import {
  analyzeSentiment,
  createSentimentTimeline,
  detectSentimentShifts,
} from '../../sentiment';
import { detectWithSentiment } from '../../detection';

/**
 * Input schema for analyze_sentiment tool
 */
export const AnalyzeSentimentInputSchema = z.object({
  text: z.string().min(20, 'Text must be at least 20 characters'),
  include_timeline: z.boolean().optional(),
  include_shifts: z.boolean().optional(),
  min_shift_delta: z.number().min(0).max(1).optional(),
  combine_with_patterns: z.boolean().optional(),
});

export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

/**
 * Format sentiment score for display
 */
function formatSentimentScore(score: number): string {
  if (score > 0.5) return 'Very Positive';
  if (score > 0.2) return 'Positive';
  if (score > -0.2) return 'Neutral';
  if (score > -0.5) return 'Negative';
  return 'Very Negative';
}

/**
 * Format sentiment analysis result for MCP output
 */
function formatSentimentResult(
  _text: string,
  sentimentScore: ReturnType<typeof analyzeSentiment>,
  timeline?: ReturnType<typeof createSentimentTimeline>,
  shifts?: ReturnType<typeof detectSentimentShifts>,
  combinedResult?: ReturnType<typeof detectWithSentiment>
): string {
  const lines: string[] = [];

  lines.push('## Sentiment Analysis Results');
  lines.push('');

  // Overall sentiment
  const sentiment = formatSentimentScore(sentimentScore.score);
  lines.push(`**Overall Sentiment:** ${sentiment} (${(sentimentScore.score * 100).toFixed(0)}%)`);
  lines.push(`**Confidence:** ${(sentimentScore.confidence * 100).toFixed(0)}%`);
  lines.push(`**Positive Words:** ${sentimentScore.positiveCount}`);
  lines.push(`**Negative Words:** ${sentimentScore.negativeCount}`);
  lines.push('');

  // Influential words
  if (sentimentScore.influentialWords.length > 0) {
    lines.push('### Influential Words');
    lines.push('');
    const topWords = sentimentScore.influentialWords.slice(0, 10);
    topWords.forEach((word) => {
      const emoji = word.sentiment > 0 ? '✓' : '✗';
      lines.push(
        `${emoji} "${word.word}" - ${word.sentiment > 0 ? '+' : ''}${(word.sentiment * 100).toFixed(0)}%`
      );
    });
    lines.push('');
  }

  // Timeline
  if (timeline && timeline.segments.length > 0) {
    lines.push('### Sentiment Timeline');
    lines.push('');
    lines.push('How sentiment changes throughout the text:');
    lines.push('');

    timeline.segments.forEach((segment, i) => {
      const marker = i === 0 ? 'Start' : i === timeline.segments.length - 1 ? 'End' : `Segment ${i}`;
      const sentiment = formatSentimentScore(segment.score);
      lines.push(
        `**${marker}:** ${sentiment} (${(segment.score * 100).toFixed(0)}%) - "${segment.text.slice(0, 60)}..."`
      );
    });
    lines.push('');
  }

  // Shifts
  if (shifts && shifts.length > 0) {
    lines.push('### Sentiment Shifts Detected');
    lines.push('');

    shifts.forEach((shift, i) => {
      const fromSentiment = formatSentimentScore(shift.from);
      const toSentiment = formatSentimentScore(shift.to);
      const emoji = shift.delta > 0 ? '↗️' : '↘️';

      lines.push(
        `${i + 1}. ${emoji} **${shift.type}** (${fromSentiment} → ${toSentiment})`
      );
      lines.push(`   - Change: +${(shift.delta * 100).toFixed(0)}%`);
      lines.push('');
    });
  }

  // Combined detection
  if (combinedResult && combinedResult.detected) {
    lines.push('---');
    lines.push('');
    lines.push('### 🎯 Combined Pattern + Sentiment Detection');
    lines.push('');

    if (combinedResult.hasTransition) {
      lines.push('✅ **Problem-to-Solution Transition Detected**');
      lines.push('This text shows a clear journey from frustration/problem to resolution.');
      lines.push('');
    } else if (combinedResult.shifts.length > 0) {
      lines.push('📊 **Sentiment Shifts Detected**');
      lines.push(`Detected ${combinedResult.shifts.length} sentiment shift(s) in the text.`);
      lines.push('');
    }

    lines.push(`**Combined Confidence:** ${(combinedResult.combinedConfidence * 100).toFixed(0)}%`);
    lines.push('');

    if (combinedResult.reasoning.length > 0) {
      lines.push('**Detection Reasoning:**');
      combinedResult.reasoning.forEach((reason) => {
        lines.push(`- ${reason}`);
      });
      lines.push('');
    }

    if (combinedResult.suggestedType) {
      lines.push(`**Suggested Knowledge Type:** ${combinedResult.suggestedType}`);
      lines.push('');
      lines.push('### 💡 Recommendation');
      lines.push('');
      lines.push(
        'This text demonstrates a learning moment worth capturing. Consider creating a knowledge item with the context, problem faced, and solution discovered.'
      );
    }
  }

  return lines.join('\n');
}

/**
 * Sentiment analysis tool implementation
 */
export const analyze_sentiment_tool = {
  name: 'analyze_sentiment',
  description:
    'Analyze sentiment in text to detect problem-solving moments. ' +
    'Tracks sentiment shifts, positive/negative word ratios, and combines with pattern matching for accurate detection.',
  inputSchema: AnalyzeSentimentInputSchema,

  async execute(
    params: AnalyzeSentimentInput,
    _context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Analyze sentiment
    const sentimentScore = analyzeSentiment(params.text);

    // Optionally include timeline
    const timeline =
      params.include_timeline === true ? createSentimentTimeline(params.text) : undefined;

    // Optionally include shifts
    const shifts =
      params.include_shifts === true
        ? detectSentimentShifts(params.text, params.min_shift_delta)
        : undefined;

    // Optionally combine with patterns
    const combinedResult =
      params.combine_with_patterns === true
        ? detectWithSentiment(params.text, {
            minSentimentShift: params.min_shift_delta,
          })
        : undefined;

    // Format output
    const formatted = formatSentimentResult(
      params.text,
      sentimentScore,
      timeline,
      shifts,
      combinedResult
    );

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
