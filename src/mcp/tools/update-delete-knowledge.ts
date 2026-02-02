import type Database from 'bun:sqlite';
import { z } from 'zod';
import { UpdateKnowledgeItemSchema } from '../../types';
import {
  updateKnowledgeItem as dbUpdateKnowledge,
  deleteKnowledgeItem as dbDeleteKnowledge,
  getKnowledgeItemById,
} from '../../db/operations';

/**
 * Input schema for update_knowledge tool
 * Extends UpdateKnowledgeItem with required id and optional updated_at for optimistic locking
 */
export const UpdateKnowledgeInputSchema = UpdateKnowledgeItemSchema.extend({
  id: z.string().min(1, 'ID is required'),
  updated_at: z.string().datetime().optional(),
}).strict();

/**
 * Input type for update_knowledge tool
 */
export type UpdateKnowledgeInput = z.infer<typeof UpdateKnowledgeInputSchema>;

/**
 * Result type for update_knowledge tool
 */
export interface UpdateKnowledgeSuccess {
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

export interface UpdateKnowledgeError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type UpdateKnowledgeResult = UpdateKnowledgeSuccess | UpdateKnowledgeError;

/**
 * Input schema for delete_knowledge tool
 */
export const DeleteKnowledgeInputSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

/**
 * Input type for delete_knowledge tool
 */
export type DeleteKnowledgeInput = z.infer<typeof DeleteKnowledgeInputSchema>;

/**
 * Result type for delete_knowledge tool
 */
export interface DeleteKnowledgeSuccess {
  success: true;
  data: {
    deleted: true;
    item: {
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
  };
}

export interface DeleteKnowledgeError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type DeleteKnowledgeResult = DeleteKnowledgeSuccess | DeleteKnowledgeError;

/**
 * Update a knowledge item
 *
 * Supports partial updates and optimistic locking using updated_at timestamp.
 */
export function updateKnowledge(db: Database, input: unknown): UpdateKnowledgeResult {
  // Validate input
  const validationResult = UpdateKnowledgeInputSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Invalid input: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      },
    };
  }

  const { id, updated_at, ...updateData } = validationResult.data;

  // Check if item exists
  const existingItem = getKnowledgeItemById(db, id);
  if (!existingItem) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Knowledge item with ID '${id}' not found`,
      },
    };
  }

  // Optimistic locking: check updated_at if provided
  if (updated_at && existingItem.updated_at !== updated_at) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: `Item was modified by another user. Please refresh and try again.`,
      },
    };
  }

  // Perform update
  const updatedItem = dbUpdateKnowledge(db, id, updateData);

  if (!updatedItem) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Knowledge item with ID '${id}' not found`,
      },
    };
  }

  return {
    success: true,
    data: {
      id: updatedItem.id,
      project: updatedItem.project,
      file_context: updatedItem.file_context,
      type: updatedItem.type,
      summary: updatedItem.summary,
      content: updatedItem.content,
      decision_rationale: updatedItem.decision_rationale,
      alternatives_considered: updatedItem.alternatives_considered,
      solution_verified: updatedItem.solution_verified,
      tags: updatedItem.tags,
      related_issues: updatedItem.related_issues,
      created_at: updatedItem.created_at,
      updated_at: updatedItem.updated_at,
    },
  };
}

/**
 * Delete a knowledge item
 *
 * Permanently removes a knowledge item from the database.
 */
export function deleteKnowledge(db: Database, input: unknown): DeleteKnowledgeResult {
  // Validate input
  const validationResult = DeleteKnowledgeInputSchema.safeParse(input);

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

  // Get item before deletion (to return in response)
  const existingItem = getKnowledgeItemById(db, id);
  if (!existingItem) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Knowledge item with ID '${id}' not found`,
      },
    };
  }

  // Perform deletion
  const deleted = dbDeleteKnowledge(db, id);

  if (!deleted) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Knowledge item with ID '${id}' not found`,
      },
    };
  }

  return {
    success: true,
    data: {
      deleted: true,
      item: {
        id: existingItem.id,
        project: existingItem.project,
        file_context: existingItem.file_context,
        type: existingItem.type,
        summary: existingItem.summary,
        content: existingItem.content,
        decision_rationale: existingItem.decision_rationale,
        alternatives_considered: existingItem.alternatives_considered,
        solution_verified: existingItem.solution_verified,
        tags: existingItem.tags,
        related_issues: existingItem.related_issues,
        created_at: existingItem.created_at,
        updated_at: existingItem.updated_at,
      },
    },
  };
}

/**
 * MCP tool definition for update_knowledge
 */
export const update_knowledge_tool = {
  name: 'update_knowledge',
  description:
    'Update an existing knowledge item. ' +
    'Only specified fields will be updated (partial update). ' +
    'Use updated_at parameter for optimistic locking to prevent concurrent modifications.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string' as const,
        description: 'The ID of the knowledge item to update',
      },
      updated_at: {
        type: 'string' as const,
        description:
          "Optional timestamp for optimistic locking. If provided, the update will only succeed if the item's updated_at matches this value.",
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
        description: 'Type of knowledge',
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
        description: 'Why this approach was chosen',
      },
      alternatives_considered: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Alternative approaches that were considered',
      },
      solution_verified: {
        type: 'boolean' as const,
        description: 'Whether the solution has been verified to work',
      },
      tags: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Tags for categorization and search',
      },
      related_issues: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Related issue numbers or URLs',
      },
    },
    required: ['id'],
  },
};

/**
 * MCP tool definition for delete_knowledge
 */
export const delete_knowledge_tool = {
  name: 'delete_knowledge',
  description: 'Permanently delete a knowledge item. This action cannot be undone.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string' as const,
        description: 'The ID of the knowledge item to delete',
      },
    },
    required: ['id'],
  },
};
