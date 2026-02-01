/**
 * KnowledgeItem type definition
 *
 * Represents a piece of institutional knowledge captured from coding contexts
 */

export type KnowledgeItemType = 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting';

export interface KnowledgeItem {
  id: string;
  project: string;
  file_context: string;
  type: KnowledgeItemType;
  summary: string;
  content: string;
  decision_rationale?: string;
  alternatives_considered?: string[];
  solution_verified: boolean;
  tags?: string[];
  related_issues?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Types for creating/updating knowledge items
 */
export interface CreateKnowledgeItem {
  id?: string;
  project: string;
  file_context: string;
  type: KnowledgeItemType;
  summary: string;
  content: string;
  decision_rationale?: string;
  alternatives_considered?: string[];
  solution_verified?: boolean;
  tags?: string[];
  related_issues?: string[];
}

export interface UpdateKnowledgeItem {
  project?: string;
  file_context?: string;
  type?: KnowledgeItemType;
  summary?: string;
  content?: string;
  decision_rationale?: string;
  alternatives_considered?: string[];
  solution_verified?: boolean;
  tags?: string[];
  related_issues?: string[];
}
