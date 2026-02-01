import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createTestDb,
  createTestDbFile,
  cleanupTestDb,
  sampleKnowledgeItem,
  insertSampleKnowledgeItem,
} from "../utils/test-helpers";
import { runMigrations, migrateDown, closeDb } from "../../src/db/schema";
import type { KnowledgeItem } from "../../src/types";

describe("Database Schema", () => {
  const testDbPath = "./test-knowledge.db";

  afterEach(() => {
    // Clean up test database file after each test
    cleanupTestDb(testDbPath);
  });

  describe("Database Initialization", () => {
    it("should create in-memory database for isolated testing", () => {
      const db = createTestDb();
      expect(db).toBeDefined();
      closeDb(db);
    });

    it("should create file-based test database", () => {
      const db = createTestDbFile(testDbPath);
      const { existsSync } = require("fs");
      expect(existsSync(testDbPath)).toBe(true);
      closeDb(db);
    });
  });

  describe("Migrations", () => {
    it("should create knowledge_items table with all required fields", () => {
      const db = createTestDb();

      // Check table exists
      const tableInfo = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_items'")
        .get();

      expect(tableInfo).toBeDefined();

      // Check columns
      const columns = db.query("PRAGMA table_info(knowledge_items)").all() as Array<{
        name: string;
      }>;

      const columnNames = columns.map((col) => col.name);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("project");
      expect(columnNames).toContain("file_context");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("summary");
      expect(columnNames).toContain("content");
      expect(columnNames).toContain("decision_rationale");
      expect(columnNames).toContain("alternatives_considered");
      expect(columnNames).toContain("solution_verified");
      expect(columnNames).toContain("tags");
      expect(columnNames).toContain("related_issues");
      expect(columnNames).toContain("created_at");
      expect(columnNames).toContain("updated_at");

      closeDb(db);
    });

    it("should create indexes for common queries", () => {
      const db = createTestDb();

      // Check indexes exist
      const indexes = db
        .query(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='knowledge_items'"
        )
        .all() as Array<{ name: string }>;

      const indexNames = indexes.map((idx) => idx.name);

      // SQLite creates an automatic index for PRIMARY KEY
      expect(indexNames.length).toBeGreaterThanOrEqual(2);

      closeDb(db);
    });

    it("should insert and retrieve knowledge item using test helpers", () => {
      const db = createTestDb();

      // Use test helper to insert sample data
      const itemId = insertSampleKnowledgeItem(db);

      // Retrieve the item
      const retrieved = db.query("SELECT * FROM knowledge_items WHERE id = ?").get(itemId) as any;

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(sampleKnowledgeItem.id);
      expect(retrieved.project).toBe(sampleKnowledgeItem.project);
      expect(retrieved.type).toBe(sampleKnowledgeItem.type);
      expect(retrieved.solution_verified).toBe(1);

      closeDb(db);
    });
  });

  describe("Migration Down", () => {
    it("should drop knowledge_items table", () => {
      const db = createTestDb();

      // Verify table exists
      let tableExists = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_items'")
        .get();
      expect(tableExists).toBeDefined();

      // Migrate down
      migrateDown(db);

      // Verify table is gone
      tableExists = db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_items'")
        .get();
      expect(tableExists).toBeNull();

      closeDb(db);
    });
  });
});
