import type Database from 'bun:sqlite';
import type { KnowledgeItem, CreateKnowledgeItem, UpdateKnowledgeItem } from '../types';

/**
 * Generate a unique ID for a knowledge item
 */
function generateId(): string {
  return `ki-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Create a new knowledge item
 */
export function createKnowledgeItem(db: Database, data: CreateKnowledgeItem): KnowledgeItem {
  const id = data.id || generateId();
  const timestamp = now();

  const stmt = db.query(`
    INSERT INTO knowledge_items (
      id, project, file_context, type, summary, content,
      decision_rationale, alternatives_considered, solution_verified,
      tags, related_issues, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.project,
    data.file_context,
    data.type,
    data.summary,
    data.content,
    data.decision_rationale || null,
    data.alternatives_considered ? JSON.stringify(data.alternatives_considered) : null,
    data.solution_verified ? 1 : 0,
    data.tags ? JSON.stringify(data.tags) : null,
    data.related_issues ? JSON.stringify(data.related_issues) : null,
    timestamp,
    timestamp
  );

  return getKnowledgeItemById(db, id)!;
}

/**
 * Get a knowledge item by ID
 */
export function getKnowledgeItemById(db: Database, id: string): KnowledgeItem | null {
  const stmt = db.query('SELECT * FROM knowledge_items WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) {
    return null;
  }

  return deserializeRow(row);
}

/**
 * List all knowledge items
 */
export function listKnowledgeItems(db: Database): KnowledgeItem[] {
  const stmt = db.query('SELECT * FROM knowledge_items ORDER BY created_at DESC');
  const rows = stmt.all() as any[];

  return rows.map(deserializeRow);
}

/**
 * Update a knowledge item
 */
export function updateKnowledgeItem(
  db: Database,
  id: string,
  data: UpdateKnowledgeItem
): KnowledgeItem | null {
  const existing = getKnowledgeItemById(db, id);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (data.project !== undefined) {
    updates.push('project = ?');
    values.push(data.project);
  }
  if (data.file_context !== undefined) {
    updates.push('file_context = ?');
    values.push(data.file_context);
  }
  if (data.type !== undefined) {
    updates.push('type = ?');
    values.push(data.type);
  }
  if (data.summary !== undefined) {
    updates.push('summary = ?');
    values.push(data.summary);
  }
  if (data.content !== undefined) {
    updates.push('content = ?');
    values.push(data.content);
  }
  if (data.decision_rationale !== undefined) {
    updates.push('decision_rationale = ?');
    values.push(data.decision_rationale);
  }
  if (data.alternatives_considered !== undefined) {
    updates.push('alternatives_considered = ?');
    values.push(JSON.stringify(data.alternatives_considered));
  }
  if (data.solution_verified !== undefined) {
    updates.push('solution_verified = ?');
    values.push(data.solution_verified ? 1 : 0);
  }
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(data.tags));
  }
  if (data.related_issues !== undefined) {
    updates.push('related_issues = ?');
    values.push(JSON.stringify(data.related_issues));
  }

  // Always update updated_at
  updates.push('updated_at = ?');
  values.push(now());

  values.push(id);

  const stmt = db.query(`UPDATE knowledge_items SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getKnowledgeItemById(db, id);
}

/**
 * Delete a knowledge item
 */
export function deleteKnowledgeItem(db: Database, id: string): boolean {
  const stmt = db.query('DELETE FROM knowledge_items WHERE id = ?');
  const result = stmt.run(id);

  return (result.changes as number) > 0;
}

/**
 * Query knowledge items with filters
 */
export interface QueryOptions {
  project?: string;
  type?: string;
  tags?: string[];
  solution_verified?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export function queryKnowledgeItems(
  db: Database,
  filters: QueryOptions = {},
  pagination: PaginationOptions = {}
): KnowledgeItem[] {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.project) {
    conditions.push('project = ?');
    values.push(filters.project);
  }

  if (filters.type) {
    conditions.push('type = ?');
    values.push(filters.type);
  }

  if (filters.solution_verified !== undefined) {
    conditions.push('solution_verified = ?');
    values.push(filters.solution_verified ? 1 : 0);
  }

  // Build query
  let sql = 'SELECT * FROM knowledge_items';

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC';

  if (pagination.limit) {
    sql += ' LIMIT ?';
    values.push(pagination.limit);
  }

  if (pagination.offset) {
    sql += ' OFFSET ?';
    values.push(pagination.offset);
  }

  const stmt = db.query(sql);
  const rows = stmt.all(...values) as any[];

  return rows.map(deserializeRow);
}

/**
 * Deserialize a database row to a KnowledgeItem
 */
function deserializeRow(row: any): KnowledgeItem {
  return {
    id: row.id,
    project: row.project,
    file_context: row.file_context,
    type: row.type,
    summary: row.summary,
    content: row.content,
    decision_rationale: row.decision_rationale || undefined,
    alternatives_considered: row.alternatives_considered
      ? JSON.parse(row.alternatives_considered)
      : undefined,
    solution_verified: row.solution_verified === 1,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    related_issues: row.related_issues ? JSON.parse(row.related_issues) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
