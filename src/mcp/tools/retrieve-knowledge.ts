import type Database from 'bun:sqlite';
import { z } from 'zod';
import { KnowledgeItemTypeSchema } from '../../types';
import { getKnowledgeItemById, queryKnowledgeItems } from '../../db/operations';

/**
 * Input schema for get_knowledge tool
 */
export const GetKnowledgeInputSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/**
 * Input type for get_knowledge tool
 */
export type GetKnowledgeInput = z.infer<typeof GetKnowledgeInputSchema>;

/**
 * Result type for get_knowledge tool
 */
export interface GetKnowledgeSuccess {
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

export interface GetKnowledgeError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type GetKnowledgeResult = GetKnowledgeSuccess | GetKnowledgeError;

/**
 * Input schema for list_knowledge tool
 */
export const ListKnowledgeInputSchema = z.object({
  project: z.string().optional(),
  type: KnowledgeItemTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Input type for list_knowledge tool
 */
export type ListKnowledgeInput = z.infer<typeof ListKnowledgeInputSchema>;

/**
 * Result type for list_knowledge tool
 */
export interface ListKnowledgeSuccess {
  success: true;
  data: {
    items: Array<{
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
    }>;
    count: number;
  };
}

export interface ListKnowledgeError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ListKnowledgeResult = ListKnowledgeSuccess | ListKnowledgeError;

/**
 * Get a single knowledge item by ID
 */
export function getKnowledge(db: Database, input: unknown): GetKnowledgeResult {
  // Validate input
  const validationResult = GetKnowledgeInputSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Invalid input: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      },
    };
  }

  const { id } = validationResult.data;

  // Get item from database
  const item = getKnowledgeItemById(db, id);

  if (!item) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Knowledge item with ID '${id}' not found`,
      },
    };
  }

  // Track usage for the retrieved item (fire-and-forget)
  setImmediate(() => {
    try {
      const { trackItemAccess } = require('../../db/operations');
      trackItemAccess(db, id);
    } catch (error) {
      // Silently fail to avoid blocking
      console.error(`Failed to track access for ${id}:`, error);
    }
  });

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
}

/**
 * List knowledge items with optional filters and pagination
 */
export function listKnowledge(db: Database, input: unknown): ListKnowledgeResult {
  // Validate input
  const validationResult = ListKnowledgeInputSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Invalid input: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      },
    };
  }

  const { project, type, limit = 50, offset = 0 } = validationResult.data;

  // Query items from database
  const items = queryKnowledgeItems(db, { project, type }, { limit, offset });

  // Get total count (without pagination)
  const totalCount = queryKnowledgeItems(db, { project, type }).length;

  return {
    success: true,
    data: {
      items: items.map((item) => ({
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
      })),
      count: totalCount,
    },
  };
}

/**
 * MCP tool definition for get_knowledge
 */
export const get_knowledge_tool = {
  name: 'get_knowledge',
  description: 'Retrieve a single knowledge item by its ID',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string' as const,
        description: 'The ID of the knowledge item to retrieve',
      },
    },
    required: ['id'],
  },
};

/**
 * MCP tool definition for list_knowledge
 */
export const list_knowledge_tool = {
  name: 'list_knowledge',
  description:
    'List knowledge items with optional filtering and pagination. ' +
    'Returns items ordered by creation date (newest first).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project: {
        type: 'string' as const,
        description: 'Filter by project name (optional)',
      },
      type: {
        type: 'string' as const,
        enum: ['solution', 'pattern', 'gotcha', 'win', 'troubleshooting'],
        description: 'Filter by knowledge item type (optional)',
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of items to return (default: 50, max: 100)',
        minimum: 1,
        maximum: 100,
      },
      offset: {
        type: 'number' as const,
        description: 'Number of items to skip (for pagination, default: 0)',
        minimum: 0,
      },
    },
  },
};
