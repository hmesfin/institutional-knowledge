import { describe, it, expect } from "bun:test";
import {
  createTestDb,
  closeDb,
  insertSampleKnowledgeItems,
  sampleKnowledgeItem,
  insertSampleKnowledgeItem,
} from "../../utils/test-helpers";
import { getKnowledge, listKnowledge } from "../../../src/mcp/tools/retrieve-knowledge";
import type { ListKnowledgeInput } from "../../../src/mcp/tools/retrieve-knowledge";

// Helper to generate N unique knowledge items
function generateTestItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...sampleKnowledgeItem,
    id: `test-${i}`,
    summary: `Test item ${i}`,
  }));
}

describe("get_knowledge and list_knowledge MCP Tools", () => {
  describe("get_knowledge", () => {
    it("should return knowledge item by ID", () => {
      const db = createTestDb();
      const items = insertSampleKnowledgeItems(db);

      const result = getKnowledge(db, { id: items[0] });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(items[0]);

      closeDb(db);
    });

    it("should return 404 for non-existent ID", () => {
      const db = createTestDb();

      const result = getKnowledge(db, { id: "non-existent-id" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("NOT_FOUND");

      closeDb(db);
    });

    it("should return all fields for knowledge item", () => {
      const db = createTestDb();
      const items = insertSampleKnowledgeItems(db, [sampleKnowledgeItem]);

      const result = getKnowledge(db, { id: items[0] });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: expect.any(String),
        project: expect.any(String),
        file_context: expect.any(String),
        type: expect.any(String),
        summary: expect.any(String),
        content: expect.any(String),
        solution_verified: expect.any(Boolean),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      closeDb(db);
    });

    it("should validate id parameter", () => {
      const db = createTestDb();

      const result = getKnowledge(db, { id: "" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should return error for missing id parameter", () => {
      const db = createTestDb();

      const result = getKnowledge(db, {} as any);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });
  });

  describe("list_knowledge", () => {
    it("should return all knowledge items when no filters", () => {
      const db = createTestDb();
      const items = insertSampleKnowledgeItems(db, [
        sampleKnowledgeItem,
        { ...sampleKnowledgeItem, id: "test-2", summary: "Item 2" },
        { ...sampleKnowledgeItem, id: "test-3", summary: "Item 3" },
        { ...sampleKnowledgeItem, id: "test-4", summary: "Item 4" },
        { ...sampleKnowledgeItem, id: "test-5", summary: "Item 5" },
      ]);

      const result = listKnowledge(db, {});

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.items).toHaveLength(5);
      expect(result.data?.count).toBe(5);

      closeDb(db);
    });

    it("should return empty array when no items exist", () => {
      const db = createTestDb();

      const result = listKnowledge(db, {});

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual([]);
      expect(result.data?.count).toBe(0);

      closeDb(db);
    });

    it("should filter by project", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, [
        { ...sampleKnowledgeItem, id: "1", project: "project-a" },
        { ...sampleKnowledgeItem, id: "2", project: "project-b" },
        { ...sampleKnowledgeItem, id: "3", project: "project-a" },
      ]);

      const result = listKnowledge(db, { project: "project-a" });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.items.every((item) => item.project === "project-a")).toBe(true);

      closeDb(db);
    });

    it("should filter by type", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, [
        { ...sampleKnowledgeItem, id: "1", type: "solution" as const },
        { ...sampleKnowledgeItem, id: "2", type: "pattern" as const },
        { ...sampleKnowledgeItem, id: "3", type: "solution" as const },
      ]);

      const result = listKnowledge(db, { type: "solution" });

      expect(result.success).toBe(true);
      expect(result.data?.items.length).toBe(2);
      expect(result.data?.items.every((item) => item.type === "solution")).toBe(true);

      closeDb(db);
    });

    it("should filter by multiple criteria", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, [
        { ...sampleKnowledgeItem, id: "1", project: "proj-a", type: "solution" as const },
        { ...sampleKnowledgeItem, id: "2", project: "proj-a", type: "pattern" as const },
        { ...sampleKnowledgeItem, id: "3", project: "proj-b", type: "solution" as const },
      ]);

      const result = listKnowledge(db, { project: "proj-a", type: "solution" });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0].project).toBe("proj-a");
      expect(result.data?.items[0].type).toBe("solution");

      closeDb(db);
    });

    it("should support pagination with limit", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, generateTestItems(10));

      const result = listKnowledge(db, { limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(5);
      expect(result.data?.count).toBe(10); // Total count should still be 10

      closeDb(db);
    });

    it("should support pagination with offset", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, generateTestItems(10));

      const page1 = listKnowledge(db, { limit: 5, offset: 0 });
      const page2 = listKnowledge(db, { limit: 5, offset: 5 });

      expect(page1.success).toBe(true);
      expect(page2.success).toBe(true);
      expect(page1.data?.items).toHaveLength(5);
      expect(page2.data?.items).toHaveLength(5);

      // Ensure items are different
      const page1Ids = page1.data?.items.map((i) => i.id);
      const page2Ids = page2.data?.items.map((i) => i.id);
      const intersection = page1Ids?.filter((id) => page2Ids?.includes(id));
      expect(intersection?.length).toBe(0);

      closeDb(db);
    });

    it("should return total count regardless of pagination", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, generateTestItems(15));

      const result = listKnowledge(db, { limit: 5, offset: 10 });

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(15);
      expect(result.data?.items).toHaveLength(5); // Only 5 items on this page

      closeDb(db);
    });

    it("should validate limit parameter", () => {
      const db = createTestDb();

      const result = listKnowledge(db, { limit: -1 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should validate offset parameter", () => {
      const db = createTestDb();

      const result = listKnowledge(db, { offset: -1 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should validate type parameter", () => {
      const db = createTestDb();

      const result = listKnowledge(db, { type: "invalid-type" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should return items ordered by created_at DESC", () => {
      const db = createTestDb();
      insertSampleKnowledgeItems(db, generateTestItems(3));

      const result = listKnowledge(db, {});

      expect(result.success).toBe(true);
      const items = result.data?.items || [];
      expect(items.length).toBeGreaterThan(1);

      // Check that items are in descending order
      for (let i = 0; i < items.length - 1; i++) {
        expect(new Date(items[i + 1].created_at) <= new Date(items[i].created_at)).toBe(true);
      }

      closeDb(db);
    });
  });
});
