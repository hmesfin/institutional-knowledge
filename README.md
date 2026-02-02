# Institutional Knowledge MCP

An MCP server that builds persistent institutional knowledge from transient coding contexts. Capture solutions, patterns, and learnings as you work, then retrieve them with semantic search.

## Features

✨ **Auto-Capture** - Automatically detect knowledge moments from conversations and logs
🔍 **Semantic Search** - Find relevant knowledge using vector embeddings
🎯 **Smart Retrieval** - Multi-tier retrieval with usage tracking and token budgeting
🧠 **Sentiment Analysis** - Detect problem-to-solution transitions
📊 **Confidence Scoring** - Evaluate knowledge value with multi-factor scoring
🔄 **Feedback Learning** - System improves with user feedback

## Quick Start

```bash
# Install
bun install

# Build
bun run build

# Run server
bun run dev
```

### Capture Your First Item

```typescript
await capture_knowledge({
  summary: "Fix JWT authentication expiration",
  content: "Set token expiration to 24h and implement refresh token rotation",
  type: "solution",
  project: "my-app",
  file_context: "src/auth/jwt.ts"
});
```

### Search Semantically

```typescript
await semantic_search({
  query: "JWT token refresh expire",
  limit: 5
});
```

### Try Auto-Capture

```typescript
await auto_capture({
  text: "Finally got it working! The solution was to use async/await...",
  threshold: 0.8,
  auto_save: true
});
```

## Documentation

- **[Quick Start Guide](./docs/QUICK_START.md)** - Get started in 5 minutes
- **[API Reference](./docs/API.md)** - Complete MCP tool documentation
- **[Examples](./docs/QUICK_START.md#common-workflows)** - Common workflows and patterns

## Installation

```bash
git clone https://github.com/hmesfin/institutional-knowledge.git
cd institutional-knowledge
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

## MCP Tools

### Core CRUD
- `capture_knowledge` - Manually save knowledge
- `get_knowledge` - Retrieve by ID
- `list_knowledge` - List with filters
- `update_knowledge` - Update item
- `delete_knowledge` - Delete item

### Search & Retrieval
- `semantic_search` - Vector similarity search
- `generate_embeddings` - Create embeddings
- `tiered_retrieval` - 4-tier smart retrieval

### Detection & Analysis
- `auto_detect` - Pattern + sentiment detection
- `analyze_sentiment` - Sentiment analysis
- `evaluate_confidence` - Confidence scoring

### Auto-Capture
- `auto_capture` - End-to-end workflow
- `provide_feedback` - Feedback on items
- `record_feedback` - Learn from feedback

See [API Reference](./docs/API.md) for complete documentation.

## Knowledge Types

| Type | Description |
|------|-------------|
| `solution` | A solution to a problem |
| `pattern` | A reusable pattern |
| `gotcha` | A common pitfall |
| `win` | A success milestone |
| `troubleshooting` | Debugging steps |

## Project Structure

```
src/
├── db/              # SQLite database operations
│   ├── schema.ts    # Database schema and migrations
│   └── operations.ts # CRUD operations
├── embeddings/      # Vector generation and search
│   ├── generator.ts # Local embedding model
│   └── quality.ts   # Embedding quality metrics
├── detection/       # Pattern matching and sentiment
│   ├── patterns.ts  # Regex patterns
│   ├── matcher.ts   # Pattern matching engine
│   ├── sentiment/   # Sentiment analysis
│   └── combined-detector.ts # Integrated detection
├── confidence/      # Confidence scoring
│   ├── types.ts     # Scoring types
│   ├── scoring.ts   # Weighted scoring algorithm
│   └── feedback.ts  # Learning mechanism
├── auto-capture/    # Auto-capture workflow
│   └── workflow.ts  # End-to-end workflow
├── retrieval/       # Advanced retrieval
│   └── tiered-service.ts # 4-tier retrieval
├── mcp/            # MCP tool definitions
│   └── tools/      # Tool implementations
└── types/          # TypeScript types
```

## Database Schema

```sql
CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  file_context TEXT NOT NULL,
  type TEXT NOT NULL,  -- solution, pattern, gotcha, win, troubleshooting
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  decision_rationale TEXT,
  alternatives_considered TEXT,
  solution_verified INTEGER DEFAULT 0,
  tags TEXT,
  related_issues TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  embedding TEXT,  -- Vector embedding
  embedding_model TEXT,
  embedding_generated_at TEXT,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TEXT,
  first_accessed_at TEXT
);
```

## How It Works

### 1. Capture
Knowledge enters the system via:
- **Manual capture** - Explicitly save important learnings
- **Auto-capture** - AI detects knowledge moments automatically

### 2. Analyze
Each item is analyzed with:
- **Pattern matching** - Detect solution/gotcha patterns
- **Sentiment analysis** - Identify problem-to-solution transitions
- **Confidence scoring** - Multi-factor confidence evaluation

### 3. Store
Items are stored with:
- Vector embeddings for semantic search
- Metadata (project, type, tags, etc.)
- Usage tracking for smart retrieval

### 4. Retrieve
Find knowledge via:
- **Semantic search** - Similarity-based search
- **Tiered retrieval** - Context-aware multi-tier system
- **Filters** - By type, project, tags

### 5. Improve
System learns from:
- User feedback (confirm/reject)
- Usage patterns (popular items)
- Confidence adjustments

## Testing

```bash
# Run all tests (420+ tests, 98%+ pass rate)
bun test

# Run specific test suite
bun test tests/auto-capture/
bun test tests/semantic-search.test.ts

# Run with coverage
bun test --coverage
```

## Configuration

Environment variables (optional):

```bash
# Database path (default: ./knowledge.db)
KNOWLEDGE_DB_PATH=./knowledge.db

# Embeddings cache directory (default: ./embeddings/cache)
EMBEDDINGS_CACHE_DIR=./embeddings/cache
```

## Roadmap

### ✅ Completed (Milestone 1-4)
- [x] Database schema with migrations
- [x] CRUD operations
- [x] Local embedding model
- [x] Semantic search
- [x] Tiered retrieval system
- [x] Pattern matching engine
- [x] Sentiment analysis
- [x] Confidence scoring
- [x] Auto-capture workflow
- [x] Feedback mechanism

### 🚧 In Progress (Milestone 5)
- [ ] Complete API documentation
- [ ] Error handling documentation
- [ ] Usage examples

### 📋 Planned
- [ ] Web UI for browsing knowledge
- [ ] Export/import functionality
- [ ] Knowledge graph visualization
- [ ] Integration with popular editors
- [ ] Multi-language support

## Contributing

Contributions welcome! Please:
1. Check existing issues
2. Fork the repository
3. Create a feature branch
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

MIT

## Acknowledgments

Built with:
- [Bun](https://bun.sh) - JavaScript runtime
- [SQLite](https://www.sqlite.org) - Database
- [Transformers.js](https://huggingface.co/docs/transformers.js) - Local embeddings
- [Zod](https://zod.dev) - Schema validation

---

**Documentation:** [Quick Start](./docs/QUICK_START.md) | [API Reference](./docs/API.md)
**Issues:** [GitHub Issues](https://github.com/hmesfin/institutional-knowledge/issues)
**License:** MIT
