import { z } from 'zod';
import type Database from 'bun:sqlite';
import { detectPatterns, extractSummary } from '../../detection';

/**
 * Input schema for auto_detect tool
 */
export const AutoDetectInputSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters'),
  context: z.string().optional(),
  file_context: z.string().optional(),
  project: z.string().optional(),
  min_confidence: z.number().min(0).max(1).optional(),
  include_summary: z.boolean().optional(),
});

export type AutoDetectInput = z.infer<typeof AutoDetectInputSchema>;

/**
 * Format detection result for MCP output
 */
function formatDetectionResult(
  text: string,
  result: Awaited<ReturnType<typeof detectPatterns>>,
  includeSummary: boolean
): string {
  const lines: string[] = [];

  if (!result.detected) {
    lines.push('## No Knowledge-Worthy Patterns Detected');
    lines.push('');
    lines.push('The analyzed text does not contain patterns that indicate a knowledge-worthy moment.');
    lines.push('');
    lines.push('**Confidence:** 0%');
    return lines.join('\n');
  }

  lines.push('## Knowledge-Worthy Pattern Detected ✅');
  lines.push('');

  // Overall confidence
  lines.push(`**Overall Confidence:** ${(result.confidence * 100).toFixed(0)}%`);
  lines.push(`**Suggested Type:** ${result.suggestedType || 'unknown'}`);
  lines.push(`**Patterns Found:** ${result.matches.length}`);
  lines.push('');

  // Best match
  if (result.bestMatch) {
    const match = result.bestMatch;
    lines.push('### Best Match');
    lines.push('');
    lines.push(`**Pattern:** ${match.pattern.id}`);
    lines.push(`**Type:** ${match.pattern.type}`);
    lines.push(`**Matched Text:** "${match.matchedText}"`);
    lines.push(`**Confidence:** ${(match.finalConfidence * 100).toFixed(0)}%`);

    if (match.reasons.length > 0) {
      lines.push('**Adjustments:**');
      match.reasons.forEach((reason) => {
        lines.push(`  - ${reason}`);
      });
    }

    if (includeSummary) {
      const summary = extractSummary(text, match);
      lines.push(`**Suggested Summary:** ${summary}`);
    }

    lines.push('');
  }

  // All matches
  if (result.matches.length > 1) {
    lines.push('### All Matches');
    lines.push('');

    result.matches.forEach((match, i) => {
      lines.push(`${i + 1}. **${match.pattern.id}** (${(match.finalConfidence * 100).toFixed(0)}%)`);
      lines.push(`   - Type: ${match.pattern.type}`);
      lines.push(`   - Text: "${match.matchedText}"`);
      lines.push('');
    });
  }

  // Suggestion
  lines.push('---');
  lines.push('');
  lines.push('### 💡 Suggestion');
  lines.push('');
  lines.push(
    `This text appears to contain a **${result.suggestedType || 'knowledge'}** moment worth capturing.`
  );
  lines.push('');
  lines.push('Consider creating a knowledge item with:');
  lines.push('');
  if (result.bestMatch && includeSummary) {
    const summary = extractSummary(text, result.bestMatch);
    lines.push(`- **Summary:** ${summary}`);
  } else {
    lines.push('- **Summary:** [Extract from the matched text]');
  }
  lines.push(`- **Type:** ${result.suggestedType || 'solution'}`);
  lines.push(`- **Content:** [Full context of what was learned]`);

  return lines.join('\n');
}

/**
 * Auto-detect tool implementation
 */
export const auto_detect_tool = {
  name: 'auto_detect',
  description:
    'Automatically detect knowledge-worthy moments in text. ' +
    'Identifies patterns like "finally working", "bug found", solutions, gotchas, and wins. ' +
    'Provides confidence scores and suggests knowledge item types.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: {
        type: 'string' as const,
        description: 'Text to analyze for knowledge-worthy patterns',
      },
      context: {
        type: 'string' as const,
        description: 'Additional context to include with the text (optional)',
      },
      file_context: {
        type: 'string' as const,
        description: 'File or code context where this text comes from (optional)',
      },
      project: {
        type: 'string' as const,
        description: 'Project name (optional)',
      },
      min_confidence: {
        type: 'number' as const,
        description: 'Minimum confidence threshold (0-1, default: 0.5)',
        minimum: 0,
        maximum: 1,
      },
      include_summary: {
        type: 'boolean' as const,
        description: 'Include suggested summary (optional, default: true)',
      },
    },
    required: ['text'] as const,
  },

  async execute(
    params: AutoDetectInput,
    _context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Combine text with context if provided
    const fullText = params.context
      ? `${params.context}\n\n${params.text}`
      : params.text;

    // Detect patterns
    const result = detectPatterns(fullText, {
      minConfidence: params.min_confidence ?? 0.5,
      contextWindow: 200,
    });

    // Format output
    const formatted = formatDetectionResult(fullText, result, params.include_summary ?? true);

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
