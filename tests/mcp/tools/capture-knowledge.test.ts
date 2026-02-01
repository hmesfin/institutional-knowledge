import { describe, it, expect, beforeEach } from "bun:test";
import { createTestDb, closeDb } from "../../utils/test-helpers";
import { captureKnowledge } from "../../../src/mcp/tools/capture-knowledge";
import type { CaptureKnowledgeInput } from "../../../src/mcp/tools/capture-knowledge";

describe("capture_knowledge MCP Tool", () => {
  let db: any;

  beforeEach(() => {
    db = createTestDb();
  });

  describe("Valid Input", () => {
    it("should capture knowledge with minimal required fields", () => {
      const input: CaptureKnowledgeInput = {
        project: "test-project",
        file_context: "src/example.ts",
        type: "solution",
        summary: "Fixed authentication bug",
        content: "Implemented JWT token validation to fix login issues",
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBeDefined();
      expect(result.data?.project).toBe(input.project);
      expect(result.data?.type).toBe(input.type);
      expect(result.data?.summary).toBe(input.summary);
      expect(result.data?.content).toBe(input.content);
      expect(result.data?.created_at).toBeDefined();
      expect(result.data?.updated_at).toBeDefined();
    });

    it("should capture knowledge with all optional fields", () => {
      const input: CaptureKnowledgeInput = {
        project: "my-project",
        file_context: "src/api/route.ts",
        type: "pattern",
        summary: "RESTful API pattern",
        content: "Standard REST API implementation pattern",
        decision_rationale: "REST is well-understood and scales well",
        alternatives_considered: ["GraphQL", "gRPC"],
        solution_verified: true,
        tags: ["api", "rest", "pattern"],
        related_issues: ["PROJ-123", "PROJ-456"],
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.decision_rationale).toBe(input.decision_rationale);
      expect(result.data?.alternatives_considered).toEqual(input.alternatives_considered);
      expect(result.data?.solution_verified).toBe(true);
      expect(result.data?.tags).toEqual(input.tags);
      expect(result.data?.related_issues).toEqual(input.related_issues);
    });

    it("should accept custom id when provided", () => {
      const input: CaptureKnowledgeInput = {
        id: "custom-id-123",
        project: "test-project",
        file_context: "src/test.ts",
        type: "gotcha",
        summary: "Async gotcha",
        content: "Forgetting to await promises",
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("custom-id-123");
    });

    it("should persist knowledge item to database", () => {
      const input: CaptureKnowledgeInput = {
        project: "persistent-project",
        file_context: "src/file.ts",
        type: "win",
        summary: "Performance win",
        content: "Optimized database queries",
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);

      // Verify it's in the database
      const { getKnowledgeItemById } = require("../../../src/db/operations");
      const retrieved = getKnowledgeItemById(db, result.data!.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.data?.id);
      expect(retrieved?.project).toBe(input.project);
    });

    it("should support all knowledge item types", () => {
      const types = ["solution", "pattern", "gotcha", "win", "troubleshooting"] as const;

      types.forEach((type) => {
        const input: CaptureKnowledgeInput = {
          project: "test-project",
          file_context: "src/test.ts",
          type,
          summary: `Test ${type}`,
          content: `Content for ${type}`,
        };

        const result = captureKnowledge(db, input);

        expect(result.success).toBe(true);
        expect(result.data?.type).toBe(type);
      });
    });
  });

  describe("Invalid Input", () => {
    it("should reject missing required fields", () => {
      const input = {
        project: "test-project",
        // Missing file_context, type, summary, content
      } as CaptureKnowledgeInput;

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Required");
    });

    it("should reject invalid knowledge item type", () => {
      const input = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "invalid-type",
        summary: "Test",
        content: "Content",
      } as CaptureKnowledgeInput;

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("type");
    });

    it("should reject empty strings", () => {
      const input = {
        project: "",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
      } as CaptureKnowledgeInput;

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid array types", () => {
      const input = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
        tags: "not-an-array",
      } as any;

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid boolean for solution_verified", () => {
      const input = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
        solution_verified: "true",
      } as any;

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(false);
    });
  });

  describe("Metadata Generation", () => {
    it("should auto-generate id when not provided", () => {
      const input: CaptureKnowledgeInput = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.id).toMatch(/^ki-\d+-[a-z0-9]+$/);
    });

    it("should set created_at timestamp", () => {
      const input: CaptureKnowledgeInput = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
      };

      const beforeTime = new Date().toISOString();
      const result = captureKnowledge(db, input);
      const afterTime = new Date().toISOString();

      expect(result.success).toBe(true);
      expect(result.data?.created_at).toBeDefined();
      expect(result.data?.created_at >= beforeTime).toBe(true);
      expect(result.data?.created_at <= afterTime).toBe(true);
    });

    it("should set updated_at equal to created_at on creation", () => {
      const input: CaptureKnowledgeInput = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);
      expect(result.data?.created_at).toBe(result.data?.updated_at);
    });

    it("should default solution_verified to false when not provided", () => {
      const input: CaptureKnowledgeInput = {
        project: "test-project",
        file_context: "src/test.ts",
        type: "solution",
        summary: "Test",
        content: "Content",
      };

      const result = captureKnowledge(db, input);

      expect(result.success).toBe(true);
      expect(result.data?.solution_verified).toBe(false);
    });
  });
});
