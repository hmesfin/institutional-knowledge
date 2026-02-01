# Institutional Knowledge MCP

An MCP server that builds persistent institutional knowledge from transient coding contexts.

## Status

🚧 Under active development - See [Issues](https://github.com/hmesfin/institutional-knowledge/issues) for progress.

## Installation

```bash
bun install
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Build
bun run build

# Run dev server
bun run dev
```

## Project Structure

```
src/
├── db/           # SQLite database operations
├── embeddings/   # Vector generation and semantic search
├── detection/    # Pattern matching and sentiment analysis
├── mcp/          # MCP tool definitions
└── types/        # TypeScript type definitions
```

## License

MIT
