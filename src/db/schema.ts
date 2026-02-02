import Database from 'bun:sqlite';

/**
 * Initialize database connection
 * Creates the database file if it doesn't exist
 */
export function initializeDb(dbPath: string = './knowledge.db'): Database {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Set WAL mode for better concurrent access
  db.exec('PRAGMA journal_mode = WAL');

  return db;
}

/**
 * Close database connection
 */
export function closeDb(db: Database): void {
  db.close();
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database): void {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Get current migration version
  const currentVersion =
    (
      db.query('SELECT MAX(version) as version FROM _migrations').get() as {
        version: number | null;
      }
    )?.version || 0;

  // Run migrations that haven't been applied yet
  if (currentVersion < 1) {
    migration1_up(db);
    db.query('INSERT INTO _migrations (version) VALUES (1)').run();
  }

  if (currentVersion < 2) {
    migration2_up(db);
    db.query('INSERT INTO _migrations (version) VALUES (2)').run();
  }
}

/**
 * Migration 1: Create knowledge_items table
 */
function migration1_up(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_items (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      file_context TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('solution', 'pattern', 'gotcha', 'win', 'troubleshooting')),
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      decision_rationale TEXT,
      alternatives_considered TEXT,
      solution_verified INTEGER NOT NULL DEFAULT 0,
      tags TEXT,
      related_issues TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_project ON knowledge_items(project);
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON knowledge_items(type);
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_created_at ON knowledge_items(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_knowledge_items_project_type ON knowledge_items(project, type);
  `);
}

/**
 * Rollback migration 1
 */
function migration1_down(db: Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_knowledge_items_project_type;
    DROP INDEX IF EXISTS idx_knowledge_items_created_at;
    DROP INDEX IF EXISTS idx_knowledge_items_type;
    DROP INDEX IF EXISTS idx_knowledge_items_project;
    DROP TABLE IF EXISTS knowledge_items;
  `);
}

/**
 * Migration 2: Add embedding columns to knowledge_items table
 */
function migration2_up(db: Database): void {
  db.exec(`
    ALTER TABLE knowledge_items
    ADD COLUMN embedding TEXT;

    ALTER TABLE knowledge_items
    ADD COLUMN embedding_model TEXT;

    ALTER TABLE knowledge_items
    ADD COLUMN embedding_generated_at TEXT;

    CREATE INDEX IF NOT EXISTS idx_knowledge_items_embedding
    ON knowledge_items(id) WHERE embedding IS NOT NULL;
  `);
}

/**
 * Rollback migration 2
 */
function migration2_down(db: Database): void {
  db.exec(`
    DROP INDEX IF EXISTS idx_knowledge_items_embedding;

    ALTER TABLE knowledge_items DROP COLUMN embedding_generated_at;
    ALTER TABLE knowledge_items DROP COLUMN embedding_model;
    ALTER TABLE knowledge_items DROP COLUMN embedding;
  `);
}

/**
 * Rollback the last migration
 */
export function migrateDown(db: Database): void {
  // Get current migration version
  const currentVersion =
    (
      db.query('SELECT MAX(version) as version FROM _migrations').get() as {
        version: number | null;
      }
    )?.version || 0;

  if (currentVersion >= 2) {
    migration2_down(db);
    db.query('DELETE FROM _migrations WHERE version = 2').run();
  }

  if (currentVersion >= 1) {
    migration1_down(db);
    db.query('DELETE FROM _migrations WHERE version = 1').run();
  }
}

/**
 * Get database schema version
 */
export function getSchemaVersion(db: Database): number {
  const result = db.query('SELECT MAX(version) as version FROM _migrations').get() as {
    version: number | null;
  };
  return result?.version || 0;
}
