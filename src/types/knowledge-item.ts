/**
 * KnowledgeItem type definition
 *
 * This file will be expanded in Issue #5 with the full schema
 * For now, this is a minimal placeholder to verify the build works
 */

export interface KnowledgeItem {
  id: string;
  type: 'solution' | 'pattern' | 'gotcha' | 'win' | 'troubleshooting';
  title: string;
  description: string;
}
