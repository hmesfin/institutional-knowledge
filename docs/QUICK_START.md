# Quick Start Guide

Get started with the Institutional Knowledge MCP server in 5 minutes.

## Installation

```bash
# Clone the repository
git clone https://github.com/hmesfin/institutional-knowledge.git
cd institutional-knowledge

# Install dependencies
bun install

# Build the project
bun run build
```

## Basic Usage

### 1. Start the MCP Server

```bash
bun run dev
```

The server will start on stdio, ready to receive MCP tool calls.

### 2. Capture Your First Knowledge Item

```typescript
// Using the MCP tool
await capture_knowledge({
  summary: "Fix authentication JWT expiration",
  content: "The JWT token was expiring too early. Solution: set expiration to 24h and implement refresh token rotation.",
  type: "solution",
  project: "my-app",
  file_context: "src/auth/jwt.ts",
  tags: ["authentication", "jwt", "security"]
});
```

### 3. Search for Knowledge

```typescript
// Semantic search finds similar items even with different wording
await semantic_search({
  query: "JWT token refresh expire",
  limit: 5
});
```

### 4. Try Auto-Capture

```typescript
// Let AI detect and capture knowledge moments automatically
await auto_capture({
  text: "Finally got the race condition fixed! The issue was that we weren't using mutex locks around the shared state access. Added std::mutex and now it works perfectly.",
  threshold: 0.8,
  auto_save: true,
  preset: "moderate"
});
```

## Common Workflows

### Workflow 1: Manual Capture & Retrieval

```typescript
// 1. Capture a solution
const item = await capture_knowledge({
  summary: "Database connection pool exhaustion",
  content: "Connection pool was running out because connections weren't being closed. Fixed by using connection pool with maxIdle: 10 and implementing proper connection lifecycle management.",
  type: "solution",
  project: "backend-api",
  file_context: "src/db/connection.ts",
  tags: ["database", "pooling", "production"]
});

// 2. Retrieve it later
const retrieved = await get_knowledge({ id: item.data.id });

// 3. Update if needed
await update_knowledge({
  id: item.data.id,
  solution_verified: true,
  tags: [...item.data.tags, "verified"]
});
```

### Workflow 2: Auto-Capture with Feedback

```typescript
// 1. Run auto-capture on a conversation or log
const result = await auto_capture({
  text: "Finally fixed the bug! It was a race condition in the event handler...",
  threshold: 0.7,
  auto_save: true
});

// 2. Review captured items
// Items above threshold are auto-saved
// Lower confidence items are flagged for review

// 3. Provide feedback to improve detection
await provide_feedback({
  item_id: "ki-1234567890-abc",
  action: "confirm",  // or "reject" or "modify"
  comment: "This was exactly what I needed!"
});
```

### Workflow 3: Smart Context Retrieval

```typescript
// 1. Use tiered retrieval for comprehensive context
const result = await tiered_retrieval({
  query: "authentication user session JWT",
  project: "my-app",
  token_budget: 10000,
  diversify: "type"  // Get diverse types: solutions, patterns, gotchas
});

// 2. Results include:
// - Tier 1: Project overview + recent wins
// - Tier 2: Semantically similar items
// - Tier 3: Usage-boosted popular items
// - Tier 4: Smartly capped to token budget

// 3. Use the context for AI assistance
console.log(`Retrieved ${result.data.total_results} items`);
```

### Workflow 4: Analyze Before Capturing

```typescript
// 1. Detect if text is a knowledge moment
const detection = await auto_detect({
  text: "Finally working! The solution was to use async/await instead of callbacks."
});

if (detection.data.detected) {
  console.log(`Knowledge moment detected! Confidence: ${detection.data.confidence}`);
}

// 2. Check sentiment
const sentiment = await analyze_sentiment({
  text: "This was terrible and awful. Finally good and working!"
});

if (sentiment.data.has_problem_to_solution) {
  console.log("Problem-to-solution transition detected!");
}

// 3. Evaluate confidence
const confidence = await evaluate_confidence({
  text: "Finally fixed the race condition...",
  preset: "moderate"
});

if (confidence.data.score > 0.8) {
  console.log("High confidence - worth capturing!");
}
```

## Knowledge Types

The system supports 5 types of knowledge items:

| Type | Description | Example |
|------|-------------|---------|
| `solution` | A solution to a problem | "Fixed race condition with mutex" |
| `pattern` | A reusable pattern | "Factory pattern for dependency injection" |
| `gotcha` | A common pitfall | "Don't use async/await in array sort" |
| `win` | A success milestone | "Finally shipped after 3 months!" |
| `troubleshooting` | Debugging steps | "Steps to diagnose memory leak" |

## Tips & Best Practices

### 1. Use Descriptive Summaries
```typescript
// ❌ Bad
summary: "Bug fix"

// ✅ Good
summary: "Fix race condition in WebSocket message handler"
```

### 2. Add Relevant Tags
```typescript
tags: ["authentication", "jwt", "security", "production"]
```

### 3. Verify Solutions
```typescript
{
  type: "solution",
  solution_verified: true,  // Mark when tested
  decision_rationale: "Chose JWT over sessions for scalability"
}
```

### 4. Use Projects to Organize
```typescript
// Different projects
project: "frontend-app"
project: "backend-api"
project: "infrastructure"
```

### 5. Leverage Semantic Search
```typescript
// Search with natural language queries
await semantic_search({
  query: "how to handle expired JWT tokens",
  threshold: 0.7  // Only return similar items
});
```

### 6. Use Tiered Retrieval for Context
```typescript
// Best for AI assistant context
await tiered_retrieval({
  query: "authentication flow",
  token_budget: 8000,  // Fits in context window
  diversify: "type"    // Get diverse perspectives
});
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/semantic-search.test.ts

# Run with coverage
bun test --coverage
```

## Development

```bash
# Type check
bun run typecheck

# Build
bun run build

# Watch mode for development
bun run dev
```

## Troubleshooting

### Database locked error
```bash
# Only one process can access the database at a time
# Make sure you don't have multiple dev servers running
```

### Embeddings not working
```typescript
// Generate embeddings first
await generate_embeddings({ force: false });
```

### Auto-capture not detecting
```typescript
// Try lowering the threshold
await auto_capture({
  text: "...",
  threshold: 0.5,  // More permissive
  preset: "aggressive"
});
```

## Next Steps

- Read the [API Reference](./API.md) for complete tool documentation
- Check the [README.md](../README.md) for project overview
- Explore the test files for more examples

## Examples Repository

For complete working examples, see the `examples/` directory (coming soon).

---

**Need Help?** Open an issue on GitHub or check existing issues for solutions.
