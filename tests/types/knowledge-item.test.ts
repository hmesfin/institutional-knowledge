import { describe, it, expect } from "bun:test";
import {
  KnowledgeItemSchema,
  CreateKnowledgeItemSchema,
  UpdateKnowledgeItemSchema,
  type KnowledgeItem,
  type CreateKnowledgeItem,
  type UpdateKnowledgeItem,
} from "../../src/types/knowledge-item";

describe("KnowledgeItem Types and Validation", () => {
  const validKnowledgeItem: KnowledgeItem = {
    id: "test-id-1",
    project: "test-project",
    file_context: "src/test.ts",
    type: "solution",
    summary: "Test solution summary",
    content: "Detailed content for the solution",
    decision_rationale: "This is the rationale",
    alternatives_considered: ["Option A", "Option B"],
    solution_verified: true,
    tags: ["test", "solution"],
    related_issues: ["issue-1", "issue-2"],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };

  describe("KnowledgeItem Schema", () => {
    it("should validate a valid knowledge item", () => {
      const result = KnowledgeItemSchema.safeParse(validKnowledgeItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validKnowledgeItem.id);
        expect(result.data.type).toBe(validKnowledgeItem.type);
      }
    });

    it("should require all required fields", () => {
      const incompleteItem = {
        id: "test-id",
        project: "test-project",
      };
      const result = KnowledgeItemSchema.safeParse(incompleteItem);
      expect(result.success).toBe(false);
    });

    it("should validate valid knowledge item types", () => {
      const validTypes = ["solution", "pattern", "gotcha", "win", "troubleshooting"] as const;

      validTypes.forEach((type) => {
        const item = { ...validKnowledgeItem, type };
        const result = KnowledgeItemSchema.safeParse(item);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid knowledge item types", () => {
      const invalidItem = { ...validKnowledgeItem, type: "invalid-type" };
      const result = KnowledgeItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it("should validate ISO date strings", () => {
      const invalidDateItem = { ...validKnowledgeItem, created_at: "not-a-date" };
      const result = KnowledgeItemSchema.safeParse(invalidDateItem);
      expect(result.success).toBe(false);
    });

    it("should allow optional fields to be undefined", () => {
      const minimalItem: KnowledgeItem = {
        id: "test-id",
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test summary",
        content: "Test content",
        solution_verified: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      };

      const result = KnowledgeItemSchema.safeParse(minimalItem);
      expect(result.success).toBe(true);
    });

    it("should validate arrays for tags and related_issues", () => {
      const withArrays = {
        ...validKnowledgeItem,
        tags: ["tag1", "tag2"],
        related_issues: ["issue-1", "issue-2"],
      };

      const result = KnowledgeItemSchema.safeParse(withArrays);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["tag1", "tag2"]);
        expect(result.data.related_issues).toEqual(["issue-1", "issue-2"]);
      }
    });

    it("should reject non-array values for array fields", () => {
      const invalidArray = { ...validKnowledgeItem, tags: "not-an-array" as any };
      const result = KnowledgeItemSchema.safeParse(invalidArray);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateKnowledgeItem Schema", () => {
    it("should validate valid create input", () => {
      const createInput: CreateKnowledgeItem = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test summary",
        content: "Test content",
      };

      const result = CreateKnowledgeItemSchema.safeParse(createInput);
      expect(result.success).toBe(true);
    });

    it("should not require id for creation", () => {
      const withoutId: CreateKnowledgeItem = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test summary",
        content: "Test content",
      };

      const result = CreateKnowledgeItemSchema.safeParse(withoutId);
      expect(result.success).toBe(true);
    });

    it("should allow optional id in create input", () => {
      const withId: CreateKnowledgeItem = {
        id: "custom-id",
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test summary",
        content: "Test content",
      };

      const result = CreateKnowledgeItemSchema.safeParse(withId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("custom-id");
      }
    });

    it("should allow all optional fields", () => {
      const fullInput: CreateKnowledgeItem = {
        id: "test-id",
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test summary",
        content: "Test content",
        decision_rationale: "Rationale",
        alternatives_considered: ["A", "B"],
        solution_verified: true,
        tags: ["tag1"],
        related_issues: ["issue-1"],
      };

      const result = CreateKnowledgeItemSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
    });
  });

  describe("UpdateKnowledgeItem Schema", () => {
    it("should accept empty update object", () => {
      const emptyUpdate: UpdateKnowledgeItem = {};
      const result = UpdateKnowledgeItemSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const partialUpdate: UpdateKnowledgeItem = {
        summary: "Updated summary",
      };

      const result = UpdateKnowledgeItemSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBe("Updated summary");
      }
    });

    it("should allow multiple field updates", () => {
      const multiUpdate: UpdateKnowledgeItem = {
        type: "pattern",
        summary: "New summary",
        solution_verified: false,
      };

      const result = UpdateKnowledgeItemSchema.safeParse(multiUpdate);
      expect(result.success).toBe(true);
    });

    it("should not allow updating id", () => {
      const updateWithId = {
        id: "new-id",
      } as any;

      const result = UpdateKnowledgeItemSchema.safeParse(updateWithId);
      expect(result.success).toBe(false);
    });

    it("should not allow updating created_at", () => {
      const updateWithCreatedAt = {
        created_at: "2024-01-01T00:00:00.000Z",
      } as any;

      const result = UpdateKnowledgeItemSchema.safeParse(updateWithCreatedAt);
      expect(result.success).toBe(false);
    });

    it("should not allow updating updated_at", () => {
      const updateWithUpdatedAt = {
        updated_at: "2024-01-01T00:00:00.000Z",
      } as any;

      const result = UpdateKnowledgeItemSchema.safeParse(updateWithUpdatedAt);
      expect(result.success).toBe(false);
    });
  });

  describe("Type Safety", () => {
    it("should export KnowledgeItem type", () => {
      const item: KnowledgeItem = {
        id: "test",
        project: "test",
        file_context: "test",
        type: "solution",
        summary: "test",
        content: "test",
        solution_verified: false,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      };
      expect(item).toBeDefined();
    });

    it("should export CreateKnowledgeItem type", () => {
      const create: CreateKnowledgeItem = {
        project: "test",
        file_context: "test",
        type: "solution",
        summary: "test",
        content: "test",
      };
      expect(create).toBeDefined();
    });

    it("should export UpdateKnowledgeItem type", () => {
      const update: UpdateKnowledgeItem = {
        summary: "updated",
      };
      expect(update).toBeDefined();
    });
  });
});
