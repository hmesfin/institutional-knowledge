import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import Database from "bun:sqlite";
import { existsSync, unlinkSync } from "fs";
import { initializeDb, runMigrations, migrateDown, closeDb } from "../../src/db/schema";
import type { KnowledgeItem } from "../../src/types";

describe("Database Schema", () => {
  const testDbPath = "./test-knowledge.db";

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe("Database Initialization", () => {
    it("should create database file if it doesn't exist", () => {
      const db = initializeDb(testDbPath);
      expect(existsSync(testDbPath)).toBe(true);
      closeDb(db);
    });

    it("should open existing database", () => {
      const db1 = initializeDb(testDbPath);
      closeDb(db1);

      const db2 = initializeDb(testDbPath);
      expect(db2).toBeDefined();
      closeDb(db2);
    });
  });

  describe("Migrations", () => {
    it("should create knowledge_items table with all required fields", () => {
      const db = initializeDb(testDbPath);
      runMigrations(db);

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
      const db = initializeDb(testDbPath);
      runMigrations(db);

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

    it("should insert and retrieve knowledge item", () => {
      const db = initializeDb(testDbPath);
      runMigrations(db);

      const item: KnowledgeItem = {
        id: "test-1",
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test solution",
        content: "This is a test solution",
        decision_rationale: "Because it works",
        alternatives_considered: ["Alternative A", "Alternative B"],
        solution_verified: true,
        tags: ["test", "example"],
        related_issues: ["issue-1", "issue-2"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

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

      const retrieved = db
        .query("SELECT * FROM knowledge_items WHERE id = ?")
        .get(item.id) as any;

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(item.id);
      expect(retrieved.project).toBe(item.project);
      expect(retrieved.type).toBe(item.type);
      expect(retrieved.solution_verified).toBe(1);

      closeDb(db);
    });
  });

  describe("Migration Down", () => {
    it("should drop knowledge_items table", () => {
      const db = initializeDb(testDbPath);
      runMigrations(db);

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
