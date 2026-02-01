import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, closeDb } from "../utils/test-helpers";
import { initializeDb, runMigrations } from "../../src/db/schema";

describe("MCP Server", () => {
  let testDb: any;

  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    if (testDb) {
      closeDb(testDb);
    }
  });

  describe("Server Initialization", () => {
    it("should create server instance with valid config", async () => {
      const { createServer } = await import("../../src/mcp/server");
      const server = createServer({ database: testDb });

      expect(server).toBeDefined();
      expect(typeof server.close).toBe("function");
    });

    it("should have server info with correct metadata", async () => {
      const { createServer } = await import("../../src/mcp/server");
      const server = createServer({ database: testDb });

      const serverInfo = server.getServerInfo();
      expect(serverInfo).toBeDefined();
      expect(serverInfo.name).toBe("institutional-knowledge-mcp");
      expect(serverInfo.version).toBeDefined();

      await server.close();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid database gracefully", async () => {
      const { createServer } = await import("../../src/mcp/server");

      // Should not throw, but handle error gracefully
      expect(() => {
        createServer({ database: null as any });
      }).not.toThrow();
    });

    it("should log errors appropriately", async () => {
      const { createServer } = await import("../../src/mcp/server");
      const server = createServer({ database: testDb });

      // Verify logger exists
      expect(server.getLogger()).toBeDefined();

      await server.close();
    });
  });

  describe("Tool Registration", () => {
    it("should register available tools", async () => {
      const { createServer } = await import("../../src/mcp/server");
      const server = createServer({ database: testDb });

      const tools = server.listTools();
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);

      await server.close();
    });
  });

  describe("Server Lifecycle", () => {
    it("should start and stop server cleanly", async () => {
      const { createServer } = await import("../../src/mcp/server");
      const server = createServer({ database: testDb });

      // Server should be ready
      expect(server.isReady()).toBe(true);

      // Close should work without throwing
      await server.close();
      expect(server.isReady()).toBe(false);
    });
  });
});
