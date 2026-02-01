#!/usr/bin/env bun
/**
 * Institutional Knowledge MCP Server
 *
 * An MCP server that builds persistent institutional knowledge from
 * transient coding contexts.
 */

import { initializeDb, runMigrations, closeDb } from './db/schema.js';
import { createServer } from './mcp/server.js';

async function main() {
  // Initialize database
  const db = initializeDb('./knowledge.db');
  runMigrations(db);

  // Create server
  const server = createServer({
    database: db,
    logLevel: 'info',
  });

  // Connect to stdio transport
  await server.connect();

  // Graceful shutdown
  const shutdown = async () => {
    await server.close();
    closeDb(db);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
