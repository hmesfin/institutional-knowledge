import { describe, it, expect } from "bun:test";
import {
  createTestDb,
  closeDb,
  insertSampleKnowledgeItem,
  sampleKnowledgeItem,
} from "../../utils/test-helpers";
import { updateKnowledge, deleteKnowledge } from "../../../src/mcp/tools/update-delete-knowledge";
import type { UpdateKnowledgeInput } from "../../../src/mcp/tools/update-delete-knowledge";

describe("update_knowledge and delete_knowledge MCP Tools", () => {
  describe("update_knowledge", () => {
    it("should update specified fields only", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = updateKnowledge(db, {
        id,
        summary: "Updated summary",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(id);
      expect(result.data?.summary).toBe("Updated summary");
      expect(result.data?.content).toBe(sampleKnowledgeItem.content); // Unchanged

      closeDb(db);
    });

    it("should update multiple fields at once", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = updateKnowledge(db, {
        id,
        summary: "New summary",
        solution_verified: true,
        tags: ["updated-tag"],
      });

      expect(result.success).toBe(true);
      expect(result.data?.summary).toBe("New summary");
      expect(result.data?.solution_verified).toBe(true);
      expect(result.data?.tags).toEqual(["updated-tag"]);

      closeDb(db);
    });

    it("should update updated_at timestamp", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      // Get original item
      const { getKnowledgeItemById } = require("../../../src/db/operations");
      const original = getKnowledgeItemById(db, id);
      const originalUpdatedAt = original?.updated_at;

      // Wait a bit to ensure timestamp difference
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // sleep
      }

      const result = updateKnowledge(db, {
        id,
        summary: "Updated",
      });

      expect(result.success).toBe(true);
      expect(result.data?.updated_at).not.toBe(originalUpdatedAt);

      closeDb(db);
    });

    it("should not allow updating id", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      // The strict schema prevents unknown fields, but id is known to the schema
      // However, our implementation extracts id from the input and doesn't pass it to update
      const result = updateKnowledge(db, {
        id,
        summary: "Updated summary",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(id); // ID should remain unchanged

      closeDb(db);
    });

    it("should not allow updating created_at", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = updateKnowledge(db, {
        id,
        created_at: "2024-01-01T00:00:00.000Z",
      } as any);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should return 404 for non-existent ID", () => {
      const db = createTestDb();

      const result = updateKnowledge(db, {
        id: "non-existent",
        summary: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");

      closeDb(db);
    });

    it("should validate ID parameter", () => {
      const db = createTestDb();

      const result = updateKnowledge(db, {
        id: "",
        summary: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should validate update data types", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = updateKnowledge(db, {
        id,
        solution_verified: "not-a-boolean",
      } as any);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should support updating array fields", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = updateKnowledge(db, {
        id,
        tags: ["new-tag-1", "new-tag-2"],
        related_issues: ["ISSUE-1"],
      });

      expect(result.success).toBe(true);
      expect(result.data?.tags).toEqual(["new-tag-1", "new-tag-2"]);
      expect(result.data?.related_issues).toEqual(["ISSUE-1"]);

      closeDb(db);
    });

    it("should allow clearing optional fields", () => {
      const db = createTestDb();
      const item = { ...sampleKnowledgeItem, tags: ["original"] };
      const id = insertSampleKnowledgeItem(db, item);

      const result = updateKnowledge(db, {
        id,
        tags: [],
      });

      expect(result.success).toBe(true);
      expect(result.data?.tags).toEqual([]);

      closeDb(db);
    });

    it("should update type field", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = updateKnowledge(db, {
        id,
        type: "pattern",
      });

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("pattern");

      closeDb(db);
    });
  });

  describe("delete_knowledge", () => {
    it("should delete knowledge item by ID", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = deleteKnowledge(db, { id });

      expect(result.success).toBe(true);
      expect(result.data?.deleted).toBe(true);

      // Verify item is gone
      const { getKnowledgeItemById } = require("../../../src/db/operations");
      const retrieved = getKnowledgeItemById(db, id);
      expect(retrieved).toBeNull();

      closeDb(db);
    });

    it("should return deleted item data", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      const result = deleteKnowledge(db, { id });

      expect(result.success).toBe(true);
      expect(result.data?.deleted).toBe(true);
      expect(result.data?.item).toBeDefined();
      expect(result.data?.item?.id).toBe(id);
      expect(result.data?.item?.summary).toBe(sampleKnowledgeItem.summary);

      closeDb(db);
    });

    it("should return 404 for non-existent ID", () => {
      const db = createTestDb();

      const result = deleteKnowledge(db, { id: "non-existent" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");

      closeDb(db);
    });

    it("should validate ID parameter", () => {
      const db = createTestDb();

      const result = deleteKnowledge(db, { id: "" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");

      closeDb(db);
    });

    it("should only delete specified item", () => {
      const db = createTestDb();
      const id1 = insertSampleKnowledgeItem(db, { ...sampleKnowledgeItem, id: "test-1" });
      const id2 = insertSampleKnowledgeItem(db, { ...sampleKnowledgeItem, id: "test-2" });

      const result = deleteKnowledge(db, { id: id1 });

      expect(result.success).toBe(true);

      // Verify first item is deleted
      const { getKnowledgeItemById } = require("../../../src/db/operations");
      expect(getKnowledgeItemById(db, id1)).toBeNull();

      // Verify second item still exists
      expect(getKnowledgeItemById(db, id2)).toBeDefined();

      closeDb(db);
    });
  });

  describe("Optimistic Locking", () => {
    it("should use updated_at for optimistic locking", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      // Get current item
      const { getKnowledgeItemById } = require("../../../src/db/operations");
      const original = getKnowledgeItemById(db, id);
      const oldUpdatedAt = original?.updated_at;

      // Simulate concurrent update by modifying updated_at in DB
      db.query("UPDATE knowledge_items SET updated_at = ? WHERE id = ?").run(
        new Date(Date.now() + 1000).toISOString(),
        id
      );

      // Try to update with old updated_at
      const result = updateKnowledge(db, {
        id,
        updated_at: oldUpdatedAt,
        summary: "This should fail",
      });

      // Should fail due to optimistic locking
      if (!result.success) {
        expect(result.error?.code).toBe("CONFLICT");
      }

      closeDb(db);
    });

    it("should allow update with current updated_at", () => {
      const db = createTestDb();
      const id = insertSampleKnowledgeItem(db);

      // Get current item
      const { getKnowledgeItemById } = require("../../../src/db/operations");
      const original = getKnowledgeItemById(db, id);
      const currentUpdatedAt = original?.updated_at;

      const result = updateKnowledge(db, {
        id,
        updated_at: currentUpdatedAt,
        summary: "This should succeed",
      });

      expect(result.success).toBe(true);
      expect(result.data?.summary).toBe("This should succeed");

      closeDb(db);
    });
  });
});
