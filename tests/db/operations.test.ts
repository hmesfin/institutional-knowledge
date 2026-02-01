import { describe, it, expect } from "bun:test";
import { createTestDb, closeDb } from "../utils/test-helpers";
import {
  createKnowledgeItem,
  getKnowledgeItemById,
  listKnowledgeItems,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  queryKnowledgeItems,
} from "../../src/db/operations";
import type { CreateKnowledgeItem, UpdateKnowledgeItem } from "../../src/types";

describe("Database Operations", () => {
  describe("Create Operation", () => {
    it("should create a new knowledge item", () => {
      const db = createTestDb();

      const createData: CreateKnowledgeItem = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test solution",
        content: "This is a test solution",
      };

      const item = createKnowledgeItem(db, createData);

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.project).toBe(createData.project);
      expect(item.type).toBe(createData.type);
      expect(item.created_at).toBeDefined();
      expect(item.updated_at).toBeDefined();

      closeDb(db);
    });

    it("should create item with custom id", () => {
      const db = createTestDb();

      const createData: CreateKnowledgeItem = {
        id: "custom-id",
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test solution",
        content: "Content",
      };

      const item = createKnowledgeItem(db, createData);

      expect(item.id).toBe("custom-id");

      closeDb(db);
    });

    it("should create item with all optional fields", () => {
      const db = createTestDb();

      const createData: CreateKnowledgeItem = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "pattern",
        summary: "Test pattern",
        content: "Pattern content",
        decision_rationale: "Best practice",
        alternatives_considered: ["A", "B"],
        solution_verified: true,
        tags: ["pattern", "best-practice"],
        related_issues: ["issue-1"],
      };

      const item = createKnowledgeItem(db, createData);

      expect(item.decision_rationale).toBe(createData.decision_rationale);
      expect(item.alternatives_considered).toEqual(createData.alternatives_considered);
      expect(item.solution_verified).toBe(true);
      expect(item.tags).toEqual(createData.tags);
      expect(item.related_issues).toEqual(createData.related_issues);

      closeDb(db);
    });
  });

  describe("Read Operations", () => {
    it("should get item by id", () => {
      const db = createTestDb();

      const createData: CreateKnowledgeItem = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test solution",
        content: "Content",
      };

      const created = createKnowledgeItem(db, createData);
      const retrieved = getKnowledgeItemById(db, created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.project).toBe(created.project);

      closeDb(db);
    });

    it("should return null for non-existent id", () => {
      const db = createTestDb();

      const retrieved = getKnowledgeItemById(db, "non-existent");

      expect(retrieved).toBeNull();

      closeDb(db);
    });

    it("should list all items", () => {
      const db = createTestDb();

      createKnowledgeItem(db, {
        project: "project-a",
        file_context: "src/a.ts",
        type: "solution",
        summary: "Solution A",
        content: "Content A",
      });

      createKnowledgeItem(db, {
        project: "project-b",
        file_context: "src/b.ts",
        type: "pattern",
        summary: "Pattern B",
        content: "Content B",
      });

      const items = listKnowledgeItems(db);

      expect(items).toHaveLength(2);
      const projects = items.map((i) => i.project).sort();
      expect(projects).toEqual(["project-a", "project-b"]);

      closeDb(db);
    });

    it("should return empty array when no items exist", () => {
      const db = createTestDb();

      const items = listKnowledgeItems(db);

      expect(items).toEqual([]);

      closeDb(db);
    });
  });

  describe("Update Operation", () => {
    it("should update item fields", () => {
      const db = createTestDb();

      const created = createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Original summary",
        content: "Original content",
      });

      const updateData: UpdateKnowledgeItem = {
        summary: "Updated summary",
        solution_verified: true,
      };

      const updated = updateKnowledgeItem(db, created.id, updateData);

      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.summary).toBe("Updated summary");
      expect(updated.solution_verified).toBe(true);
      expect(updated.content).toBe("Original content"); // unchanged

      closeDb(db);
    });

    it("should update timestamp on update", () => {
      const db = createTestDb();

      const created = createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Summary",
        content: "Content",
      });

      const originalUpdatedAt = created.updated_at;

      // Wait a bit to ensure timestamp difference
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // sleep for 10ms
      }

      const updated = updateKnowledgeItem(db, created.id, {
        summary: "Updated",
      });

      expect(updated.updated_at).not.toBe(originalUpdatedAt);

      closeDb(db);
    });

    it("should return null when updating non-existent item", () => {
      const db = createTestDb();

      const result = updateKnowledgeItem(db, "non-existent", {
        summary: "Updated",
      });

      expect(result).toBeNull();

      closeDb(db);
    });

    it("should support updating array fields", () => {
      const db = createTestDb();

      const created = createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Summary",
        content: "Content",
        tags: ["original"],
      });

      const updated = updateKnowledgeItem(db, created.id, {
        tags: ["updated", "tags"],
      });

      expect(updated.tags).toEqual(["updated", "tags"]);

      closeDb(db);
    });
  });

  describe("Delete Operation", () => {
    it("should delete item by id", () => {
      const db = createTestDb();

      const created = createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Summary",
        content: "Content",
      });

      const deleted = deleteKnowledgeItem(db, created.id);

      expect(deleted).toBe(true);

      // Verify item is gone
      const retrieved = getKnowledgeItemById(db, created.id);
      expect(retrieved).toBeNull();

      closeDb(db);
    });

    it("should return false when deleting non-existent item", () => {
      const db = createTestDb();

      const deleted = deleteKnowledgeItem(db, "non-existent");

      expect(deleted).toBe(false);

      closeDb(db);
    });

    it("should only delete the specified item", () => {
      const db = createTestDb();

      const item1 = createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/test1.ts",
        type: "solution",
        summary: "Summary 1",
        content: "Content 1",
      });

      const item2 = createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/test2.ts",
        type: "solution",
        summary: "Summary 2",
        content: "Content 2",
      });

      deleteKnowledgeItem(db, item1.id);

      const remaining = getKnowledgeItemById(db, item2.id);
      expect(remaining).toBeDefined();
      expect(remaining?.id).toBe(item2.id);

      closeDb(db);
    });
  });

  describe("Query Operations", () => {
    it("should filter by project", () => {
      const db = createTestDb();

      createKnowledgeItem(db, {
        project: "project-a",
        file_context: "src/a.ts",
        type: "solution",
        summary: "Solution A",
        content: "Content A",
      });

      createKnowledgeItem(db, {
        project: "project-b",
        file_context: "src/b.ts",
        type: "solution",
        summary: "Solution B",
        content: "Content B",
      });

      createKnowledgeItem(db, {
        project: "project-a",
        file_context: "src/c.ts",
        type: "pattern",
        summary: "Pattern C",
        content: "Content C",
      });

      const results = queryKnowledgeItems(db, { project: "project-a" });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.project === "project-a")).toBe(true);

      closeDb(db);
    });

    it("should filter by type", () => {
      const db = createTestDb();

      createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/a.ts",
        type: "solution",
        summary: "Solution A",
        content: "Content A",
      });

      createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/b.ts",
        type: "gotcha",
        summary: "Gotcha B",
        content: "Content B",
      });

      createKnowledgeItem(db, {
        project: "test-project",
        file_context: "src/c.ts",
        type: "solution",
        summary: "Solution C",
        content: "Content C",
      });

      const results = queryKnowledgeItems(db, { type: "solution" });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.type === "solution")).toBe(true);

      closeDb(db);
    });

    it("should filter by multiple criteria", () => {
      const db = createTestDb();

      createKnowledgeItem(db, {
        project: "project-a",
        file_context: "src/a.ts",
        type: "solution",
        summary: "Solution A",
        content: "Content A",
      });

      createKnowledgeItem(db, {
        project: "project-a",
        file_context: "src/b.ts",
        type: "gotcha",
        summary: "Gotcha B",
        content: "Content B",
      });

      createKnowledgeItem(db, {
        project: "project-b",
        file_context: "src/c.ts",
        type: "solution",
        summary: "Solution C",
        content: "Content C",
      });

      const results = queryKnowledgeItems(db, { project: "project-a", type: "solution" });

      expect(results).toHaveLength(1);
      expect(results[0].project).toBe("project-a");
      expect(results[0].type).toBe("solution");

      closeDb(db);
    });

    it("should support pagination with limit and offset", () => {
      const db = createTestDb();

      for (let i = 1; i <= 5; i++) {
        createKnowledgeItem(db, {
          project: "test-project",
          file_context: `src/${i}.ts`,
          type: "solution",
          summary: `Solution ${i}`,
          content: `Content ${i}`,
        });
      }

      const page1 = queryKnowledgeItems(db, {}, { limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = queryKnowledgeItems(db, {}, { limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = queryKnowledgeItems(db, {}, { limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);

      closeDb(db);
    });

    it("should return empty array for no matches", () => {
      const db = createTestDb();

      createKnowledgeItem(db, {
        project: "project-a",
        file_context: "src/a.ts",
        type: "solution",
        summary: "Solution A",
        content: "Content A",
      });

      const results = queryKnowledgeItems(db, { project: "non-existent" });

      expect(results).toEqual([]);

      closeDb(db);
    });
  });
});
