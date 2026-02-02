import { z } from 'zod';
import type Database from 'bun:sqlite';
import { getTier4Results } from '../../retrieval';
import type { Tier4Options, TieredRetrievalResult } from '../../types/retrieval';

/**
 * Input schema for tiered retrieval tool
 */
export const TieredRetrievalInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  project: z.string().optional(),
  token_budget: z.number().int().min(1000).max(50000).optional(),
  diversify: z.enum(['none', 'type', 'project', 'both']).optional(),
  include_tier1: z.boolean().optional(),
  include_tier2: z.boolean().optional(),
  include_tier3: z.boolean().optional(),
});

export type TieredRetrievalInput = z.infer<typeof TieredRetrievalInputSchema>;

/**
 * Format tiered retrieval result for MCP output
 */
function formatResult(result: TieredRetrievalResult): string {
  const parts: string[] = [];

  // Tier 1: Project Context
  if (result.tier1) {
    parts.push('## Project Context (Tier 1)\n');

    const fp = result.tier1.fingerprint;
    parts.push(`**Project:** ${fp.project || 'All Projects'}`);
    parts.push(`**Total Items:** ${fp.total_items}`);

    if (Object.keys(fp.type_counts).length > 0) {
      parts.push('**Distribution:**');
      Object.entries(fp.type_counts).forEach(([type, count]) => {
        parts.push(`  - ${type}: ${count}`);
      });
    }

    if (result.tier1.recentWins.length > 0) {
      parts.push('\n**Recent Wins:**');
      result.tier1.recentWins.forEach((win, i) => {
        parts.push(`${i + 1}. ${win.summary}`);
        parts.push(`   Created: ${new Date(win.created_at).toLocaleDateString()}`);
      });
    }

    parts.push(`\n_Tier 1 Tokens: ${result.tier1.tokenCount}_\n`);
  }

  // Search Results
  if (result.finalResults.length > 0) {
    parts.push('## Relevant Knowledge Items\n');

    result.finalResults.forEach((itemResult, i) => {
      const item = itemResult.item;
      parts.push(`### ${i + 1}. ${item.summary}`);
      parts.push(`**ID:** ${item.id}`);
      parts.push(`**Type:** ${item.type}`);
      parts.push(`**Project:** ${item.project}`);
      parts.push(`**File Context:** ${item.file_context}`);

      if ('boostedSimilarity' in itemResult) {
        const boosted = itemResult as { boostedSimilarity: number };
        parts.push(`**Similarity:** ${(boosted.boostedSimilarity * 100).toFixed(1)}%`);
      } else {
        parts.push(`**Similarity:** ${(itemResult.similarity * 100).toFixed(1)}%`);
      }

      if (item.tags && item.tags.length > 0) {
        parts.push(`**Tags:** ${item.tags.join(', ')}`);
      }

      parts.push(`\n${item.content}`);

      if (item.decision_rationale) {
        parts.push(`\n**Decision Rationale:** ${item.decision_rationale}`);
      }

      if (item.alternatives_considered && item.alternatives_considered.length > 0) {
        parts.push(`\n**Alternatives Considered:**`);
        item.alternatives_considered.forEach((alt, j) => {
          parts.push(`  ${j + 1}. ${alt}`);
        });
      }

      parts.push('');
    });
  } else {
    parts.push('## No Results Found\n');
    parts.push('No knowledge items matched your query.');
  }

  // Metadata
  parts.push('\n---\n');
  parts.push('**Metadata:**');
  parts.push(`- Total Results: ${result.finalResults.length}`);
  parts.push(`- Total Tokens: ${result.totalTokens.toLocaleString()}`);
  parts.push(`- Budget Enforced: ${result.budgetEnforced ? 'Yes' : 'No'}`);
  parts.push(`- Diversity Score: ${(result.diversityScore * 100).toFixed(1)}%`);

  return parts.join('\n');
}

/**
 * Tiered retrieval tool implementation
 */
export const tiered_retrieval_tool = {
  name: 'tiered_retrieval',
  description:
    'Multi-tier knowledge retrieval with smart capping. Provides increasingly intelligent context delivery from project overview to usage-boosted semantic search.',
  inputSchema: TieredRetrievalInputSchema,

  async execute(
    params: TieredRetrievalInput,
    context: { db: Database }
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Build options
    const options: Tier4Options = {
      tokenBudget: params.token_budget,
      diversify: params.diversify,
      includeTier1: params.include_tier1,
      includeTier2: params.include_tier2,
      includeTier3: params.include_tier3,
      project: params.project,
    };

    // Execute tiered retrieval
    const result = await getTier4Results(context.db, params.query, options);

    // Format output
    const formatted = formatResult(result);

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
