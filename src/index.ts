#!/usr/bin/env bun
/**
 * Institutional Knowledge MCP Server
 *
 * An MCP server that builds persistent institutional knowledge from
 * transient coding contexts.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: 'institutional-knowledge-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {},
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

// Start the server
main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
