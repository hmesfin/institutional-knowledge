import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type Database from 'bun:sqlite';

// Import all tools and handlers
import * as tools from './tools/index.js';

// Tool definitions (for listing)
const TOOL_DEFINITIONS = [
  tools.capture_knowledge_tool,
  tools.get_knowledge_tool,
  tools.list_knowledge_tool,
  tools.update_knowledge_tool,
  tools.delete_knowledge_tool,
  tools.semantic_search_tool,
  tools.generate_embeddings_tool,
  tools.tiered_retrieval_tool,
  tools.auto_detect_tool,
  tools.analyze_sentiment_tool,
  tools.evaluate_confidence_tool,
  tools.record_feedback_tool,
  tools.auto_capture_tool,
  tools.provide_feedback_tool,
] as const;

export interface ServerConfig {
  database: Database | null;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ServerInfo {
  name: string;
  version: string;
}

/**
 * Simple logger for MCP server
 */
class Logger {
  private level: NonNullable<ServerConfig['logLevel']>;

  constructor(level: ServerConfig['logLevel'] = 'info') {
    this.level = level || 'info';
  }

  private shouldLog(level: NonNullable<ServerConfig['logLevel']>): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.error(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.error(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

/**
 * MCP Server wrapper with error handling and logging
 */
export class MCPServer {
  private server: Server;
  private database: Database | null;
  private logger: Logger;
  private isServerReady: boolean = false;
  private isServerClosed: boolean = false;

  constructor(config: ServerConfig) {
    this.database = config.database;
    this.logger = new Logger(config.logLevel);

    try {
      this.server = new Server(
        {
          name: 'institutional-knowledge-mcp',
          version: '0.1.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Register tool handlers
      this.registerToolHandlers();

      this.isServerReady = true;
      this.logger.info('MCP Server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCP server:', error);
      this.isServerReady = false;
      throw error;
    }
  }

  /**
   * Register MCP tool request handlers
   */
  private registerToolHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.logger.debug(`Tool called: ${name}`);

      // Check database is available
      if (!this.database) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: 'NO_DATABASE',
                  message: 'Database not available',
                },
              }),
            },
          ],
          isError: true,
        };
      }

      // Ensure args is defined
      const toolArgs = args ?? {};

      // Tools with separate handler functions
      switch (name) {
        case 'capture_knowledge':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tools.captureKnowledge(this.database, toolArgs)),
              },
            ],
          };

        case 'get_knowledge':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tools.getKnowledge(this.database, toolArgs)),
              },
            ],
          };

        case 'list_knowledge':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tools.listKnowledge(this.database, toolArgs)),
              },
            ],
          };

        case 'update_knowledge':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tools.updateKnowledge(this.database, toolArgs)),
              },
            ],
          };

        case 'delete_knowledge':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tools.deleteKnowledge(this.database, toolArgs)),
              },
            ],
          };

        // Tools with execute method - cast args to any to bypass strict type checking
        // since the execute methods will validate their own schemas
        case 'semantic_search':
          return await tools.semantic_search_tool.execute(toolArgs as any, { db: this.database });

        case 'generate_embeddings':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  await tools.generate_embeddings_tool.execute(toolArgs as any, { db: this.database })
                ),
              },
            ],
          };

        case 'tiered_retrieval':
          return await tools.tiered_retrieval_tool.execute(toolArgs as any, { db: this.database });

        case 'auto_detect':
          return await tools.auto_detect_tool.execute(toolArgs as any, { db: this.database });

        case 'analyze_sentiment':
          return await tools.analyze_sentiment_tool.execute(toolArgs as any, { db: this.database });

        case 'evaluate_confidence':
          return await tools.evaluate_confidence_tool.execute(toolArgs as any, { db: this.database });

        case 'record_feedback':
          return await tools.record_feedback_tool.execute(toolArgs as any, { db: this.database });

        case 'auto_capture':
          return await tools.auto_capture_tool.execute(toolArgs as any, { db: this.database });

        case 'provide_feedback':
          return await tools.provide_feedback_tool.execute(toolArgs as any, { db: this.database });

        default:
          this.logger.warn(`Unknown tool requested: ${name}`);
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    this.logger.debug('Tool handlers registered');
  }

  /**
   * Get server info
   */
  getServerInfo(): ServerInfo {
    return {
      name: 'institutional-knowledge-mcp',
      version: '0.1.0',
    };
  }

  /**
   * Check if server is ready
   */
  isReady(): boolean {
    return this.isServerReady && !this.isServerClosed;
  }

  /**
   * List available tools
   *
   * Note: Tool discovery is handled by the MCP protocol via request handlers.
   * This method is kept for debugging purposes.
   */
  listToolNames(): string[] {
    return TOOL_DEFINITIONS.map((t) => t.name);
  }

  /**
   * Connect the server to stdio transport
   */
  async connect(): Promise<void> {
    if (this.isServerClosed) {
      throw new Error('Cannot connect: server is closed');
    }

    if (!this.isServerReady) {
      throw new Error('Cannot connect: server is not ready');
    }

    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('Server connected to stdio transport');
    } catch (error) {
      this.logger.error('Failed to connect to transport:', error);
      throw error;
    }
  }

  /**
   * Close the server connection
   */
  async close(): Promise<void> {
    if (this.isServerClosed) {
      this.logger.warn('Server already closed');
      return;
    }

    try {
      await this.server.close();
      this.isServerClosed = true;
      this.isServerReady = false;
      this.logger.info('Server closed successfully');
    } catch (error) {
      this.logger.error('Error closing server:', error);
      throw error;
    }
  }

  /**
   * Get the logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get the underlying MCP server instance
   */
  get mcpServer(): Server {
    return this.server;
  }

  /**
   * Get the database instance
   */
  get db(): Database | null {
    return this.database;
  }
}

/**
 * Create a new MCP server instance
 */
export function createServer(config: ServerConfig): MCPServer {
  return new MCPServer(config);
}
