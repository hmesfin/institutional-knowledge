import { initializeDb, runMigrations, closeDb } from "../../src/db/schema";
import { unlinkSync, existsSync } from "fs";

/**
 * Create a fresh in-memory test database
 * Returns a database instance that can be used for isolated testing
 */
export function createTestDb() {
  const db = initializeDb(":memory:");
  runMigrations(db);
  return db;
}

/**
 * Create a file-based test database at a specific path
 * Useful for tests that need to verify file operations
 */
export function createTestDbFile(dbPath: string) {
  // Clean up any existing test database
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }

  const db = initializeDb(dbPath);
  runMigrations(db);
  return db;
}

/**
 * Clean up a test database file
 */
export function cleanupTestDb(dbPath: string): void {
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
}

/**
 * Fixture: Sample knowledge item for testing
 */
export const sampleKnowledgeItem = {
  id: "test-sample-1",
  project: "test-project",
  file_context: "src/test.ts",
  type: "solution" as const,
  summary: "Test solution summary",
  content:
    "This is a detailed test solution that demonstrates how to solve a specific problem.",
  decision_rationale: "This approach was chosen because it is simple and maintainable.",
  alternatives_considered: ["Alternative A", "Alternative B", "Alternative C"],
  solution_verified: true,
  tags: ["test", "example", "solution"],
  related_issues: ["issue-1", "issue-2"],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

/**
 * Fixture: Array of sample knowledge items for testing
 */
export const sampleKnowledgeItems = [
  sampleKnowledgeItem,
  {
    ...sampleKnowledgeItem,
    id: "test-sample-2",
    type: "gotcha" as const,
    summary: "Common gotcha to avoid",
    content: "This is a gotcha that developers should be aware of.",
    tags: ["gotcha", "warning"],
  },
  {
    ...sampleKnowledgeItem,
    id: "test-sample-3",
    type: "pattern" as const,
    summary: "Useful design pattern",
    content: "This is a design pattern that can be reused across projects.",
    tags: ["pattern", "architecture"],
  },
  {
    ...sampleKnowledgeItem,
    id: "test-sample-4",
    project: "another-project",
    type: "win" as const,
    summary: "Great success story",
    content: "This approach worked exceptionally well.",
    tags: ["win", "success"],
  },
  {
    ...sampleKnowledgeItem,
    id: "test-sample-5",
    type: "troubleshooting" as const,
    summary: "Troubleshooting guide",
    content: "Steps to diagnose and fix common issues.",
    tags: ["troubleshooting", "debug"],
  },
];

/**
 * Helper: Insert a sample knowledge item into the database
 */
export function insertSampleKnowledgeItem(db: any, item: any = sampleKnowledgeItem) {
  const insert = db.query(`
    INSERT INTO knowledge_items (
      id, project, file_context, type, summary, content,
      decision_rationale, alternatives_considered, solution_verified,
      tags, related_issues, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    item.id,
    item.project,
    item.file_context,
    item.type,
    item.summary,
    item.content,
    item.decision_rationale,
    JSON.stringify(item.alternatives_considered),
    item.solution_verified ? 1 : 0,
    JSON.stringify(item.tags),
    JSON.stringify(item.related_issues),
    item.created_at,
    item.updated_at
  );

  return item.id;
}

/**
 * Helper: Insert multiple sample knowledge items
 */
export function insertSampleKnowledgeItems(
  db: any,
  items: any[] = sampleKnowledgeItems
): string[] {
  return items.map((item) => insertSampleKnowledgeItem(db, item));
}

/**
 * Helper: Create a test knowledge item with overrides
 */
export function createTestKnowledgeItem(overrides: Partial<any> = {}) {
  return {
    ...sampleKnowledgeItem,
    id: `test-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
