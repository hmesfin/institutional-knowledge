import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type Database from 'bun:sqlite';

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

      this.isServerReady = true;
      this.logger.info('MCP Server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCP server:', error);
      this.isServerReady = false;
      throw error;
    }
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
   */
  listTools(): any[] {
    // TODO: Implement tool listing
    // For now, return empty array
    return [];
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
