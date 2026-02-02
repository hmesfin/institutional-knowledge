import { z } from 'zod';

/**
 * KnowledgeItem type definition
 *
 * Represents a piece of institutional knowledge captured from coding contexts
 */

export type KnowledgeItemType = 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting';

/**
 * Zod schema for validating knowledge item types
 */
export const KnowledgeItemTypeSchema = z.enum([
  'solution',
  'pattern',
  'gotcha',
  'win',
  'troubleshooting',
]);

/**
 * Zod schema for ISO date strings
 */
const IsoDateTimeSchema = z.string().datetime();

/**
 * Zod schema for KnowledgeItem
 * Validates all fields including required and optional
 */
export const KnowledgeItemSchema = z.object({
  id: z.string().min(1),
  project: z.string().min(1),
  file_context: z.string().min(1),
  type: KnowledgeItemTypeSchema,
  summary: z.string().min(1),
  content: z.string().min(1),
  decision_rationale: z.string().optional(),
  alternatives_considered: z.array(z.string()).optional(),
  solution_verified: z.boolean(),
  tags: z.array(z.string()).optional(),
  related_issues: z.array(z.string()).optional(),
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
});

export interface KnowledgeItem extends z.infer<typeof KnowledgeItemSchema> {}

/**
 * Zod schema for creating a knowledge item
 * id, created_at, and updated_at are optional (auto-generated)
 */
export const CreateKnowledgeItemSchema = z.object({
  id: z.string().min(1).optional(),
  project: z.string().min(1),
  file_context: z.string().min(1),
  type: KnowledgeItemTypeSchema,
  summary: z.string().min(1),
  content: z.string().min(1),
  decision_rationale: z.string().optional(),
  alternatives_considered: z.array(z.string()).optional(),
  solution_verified: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional(),
  related_issues: z.array(z.string()).optional(),
});

export interface CreateKnowledgeItem extends z.infer<typeof CreateKnowledgeItemSchema> {}

/**
 * Zod schema for updating a knowledge item
 * All fields optional except immutable ones (id, created_at, updated_at)
 */
export const UpdateKnowledgeItemSchema = z
  .object({
    project: z.string().min(1).optional(),
    file_context: z.string().min(1).optional(),
    type: KnowledgeItemTypeSchema.optional(),
    summary: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    decision_rationale: z.string().optional(),
    alternatives_considered: z.array(z.string()).optional(),
    solution_verified: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    related_issues: z.array(z.string()).optional(),
  })
  .strict(); // Prevent adding fields that shouldn't be updated

export interface UpdateKnowledgeItem extends z.infer<typeof UpdateKnowledgeItemSchema> {}

/**
 * Embedding vector representation
 * Array of floating point numbers (typically 384 dimensions)
 */
export type EmbeddingVector = number[];

/**
 * Options for semantic search
 */
export interface SemanticSearchOptions {
  /** Query text to search for */
  query: string;
  /** Maximum number of results to return (default: 10) */
  limit?: number;
  /** Minimum similarity threshold 0-1 (default: 0.5) */
  threshold?: number;
  /** Filter by project name */
  project?: string;
  /** Filter by knowledge item type */
  type?: KnowledgeItemType;
}

/**
 * Semantic search result with similarity score
 */
export interface SemanticSearchResult {
  /** The knowledge item */
  item: KnowledgeItem;
  /** Similarity score (0-1, higher is more similar) */
  similarity: number;
}
