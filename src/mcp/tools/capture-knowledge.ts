import type Database from 'bun:sqlite';
import { z } from 'zod';
import { CreateKnowledgeItemSchema } from '../../types';
import { createKnowledgeItem } from '../../db/operations';

/**
 * Input schema for capture_knowledge tool
 */
export const CaptureKnowledgeInputSchema = CreateKnowledgeItemSchema;

/**
 * Input type for capture_knowledge tool
 */
export type CaptureKnowledgeInput = z.infer<typeof CaptureKnowledgeInputSchema>;

/**
 * Result type for capture_knowledge tool
 */
export interface CaptureKnowledgeSuccess {
  success: true;
  data: {
    id: string;
    project: string;
    file_context: string;
    type: string;
    summary: string;
    content: string;
    decision_rationale?: string;
    alternatives_considered?: string[];
    solution_verified: boolean;
    tags?: string[];
    related_issues?: string[];
    created_at: string;
    updated_at: string;
  };
}

export interface CaptureKnowledgeError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type CaptureKnowledgeResult = CaptureKnowledgeSuccess | CaptureKnowledgeError;

/**
 * Capture knowledge item tool
 *
 * Manually captures a piece of institutional knowledge with validation.
 * Auto-generates ID and timestamps if not provided.
 */
export function captureKnowledge(db: Database, input: unknown): CaptureKnowledgeResult {
  // Validate input
  const validationResult = CaptureKnowledgeInputSchema.safeParse(input);

  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');

    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Invalid input: ${errorMessages}`,
        details: validationResult.error.errors,
      },
    };
  }

  const validatedData = validationResult.data;

  try {
    // Create the knowledge item
    const item = createKnowledgeItem(db, validatedData);

    return {
      success: true,
      data: {
        id: item.id,
        project: item.project,
        file_context: item.file_context,
        type: item.type,
        summary: item.summary,
        content: item.content,
        decision_rationale: item.decision_rationale,
        alternatives_considered: item.alternatives_considered,
        solution_verified: item.solution_verified,
        tags: item.tags,
        related_issues: item.related_issues,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown database error',
        details: error,
      },
    };
  }
}

/**
 * MCP tool definition for capture_knowledge
 */
export const capture_knowledge_tool = {
  name: 'capture_knowledge',
  description:
    'Manually capture a piece of institutional knowledge. ' +
    'Use this to record solutions, patterns, gotchas, wins, or troubleshooting steps ' +
    'from your coding work. The knowledge will be persisted and can be retrieved later.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string' as const,
        description: 'Optional custom ID (auto-generated if not provided)',
      },
      project: {
        type: 'string' as const,
        description: 'Project or repository name',
      },
      file_context: {
        type: 'string' as const,
        description: 'File or code context where this knowledge applies',
      },
      type: {
        type: 'string' as const,
        enum: ['solution', 'pattern', 'gotcha', 'win', 'troubleshooting'],
        description:
          'Type of knowledge: solution (problem solved), pattern (reusable approach), ' +
          'gotcha (pitfall to avoid), win (success story), or troubleshooting (debugging steps)',
      },
      summary: {
        type: 'string' as const,
        description: 'Brief summary of the knowledge item',
      },
      content: {
        type: 'string' as const,
        description: 'Detailed content explaining the knowledge',
      },
      decision_rationale: {
        type: 'string' as const,
        description: 'Why this approach was chosen (optional)',
      },
      alternatives_considered: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Alternative approaches that were considered (optional)',
      },
      solution_verified: {
        type: 'boolean' as const,
        description: 'Whether the solution has been verified to work (optional, defaults to false)',
      },
      tags: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Tags for categorization and search (optional)',
      },
      related_issues: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Related issue numbers or URLs (optional)',
      },
    },
    required: ['project', 'file_context', 'type', 'summary', 'content'],
  },
};
