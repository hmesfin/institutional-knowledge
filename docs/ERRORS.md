# Error Handling Guide

Common errors, their causes, and solutions for the Institutional Knowledge MCP server.

## Table of Contents

- [Error Response Format](#error-response-format)
- [Database Errors](#database-errors)
- [Validation Errors](#validation-errors)
- [Embedding Errors](#embedding-errors)
- [MCP Tool Errors](#mcp-tool-errors)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Error Response Format

All MCP tools return errors in a consistent format:

```typescript
{
  success: false;
  error: string;  // Human-readable error message
}
```

**Example:**

```typescript
// Error response
{
  success: false,
  error: "Item not found: ki-1234567890-abc"
}
```

---

## Database Errors

### "NOT NULL constraint failed"

**Cause:** Required field not provided

**Example:**

```typescript
// ❌ Missing required field
await capture_knowledge({
  summary: "Fix bug",
  // Missing: content, type, project, file_context
});
```

**Solution:**

```typescript
// ✅ Include all required fields
await capture_knowledge({
  summary: "Fix race condition",
  content: "Added mutex lock...",
  type: "solution",
  project: "my-app",
  file_context: "src/handlers.ts"
});
```

### "UNIQUE constraint failed: knowledge_items.id"

**Cause:** Attempting to create item with existing ID

**Solution:**

- Let the system auto-generate IDs (omit `id` field)
- Or use `update_knowledge` instead of `capture_knowledge`

### "database is locked"

**Cause:** Multiple processes trying to write to SQLite database

**Solutions:**

```bash
# 1. Close other connections
# Make sure you don't have multiple dev servers running

# 2. Check for locked processes
lsof knowledge.db

# 3. If persistent, delete WAL files
rm knowledge.db-wal knowledge.db-shm
```

### "no such table: knowledge_items"

**Cause:** Database not initialized or migrations not run

**Solution:**

```bash
# Database is auto-initialized on first run
# If manually creating database, run migrations:

# From your code
import { initializeDb, runMigrations } from './db/schema';

const db = initializeDb('./knowledge.db');
runMigrations(db);
```

---

## Validation Errors

### "Summary must be at least 1 character"

**Cause:** Empty or whitespace-only summary

**Solution:**

```typescript
// ❌ Bad
await capture_knowledge({
  summary: "",  // Empty
  // ...
});

// ✅ Good
await capture_knowledge({
  summary: "Fix authentication bug",
  // ...
});
```

### "Invalid type"

**Cause:** Type not one of the 5 valid types

**Valid Types:**

- `solution`
- `pattern`
- `gotcha`
- `win`
- `troubleshooting`

**Solution:**

```typescript
// ❌ Bad
await capture_knowledge({
  type: "bugfix",  // Invalid type
  // ...
});

// ✅ Good
await capture_knowledge({
  type: "solution",  // Valid type
  // ...
});
```

### "Text must be at least 50 characters" (auto_capture)

**Cause:** Input text too short for auto-capture analysis

**Solution:**

```typescript
// ❌ Too short
await auto_capture({
  text: "It works!"
});

// ✅ Sufficient length
await auto_capture({
  text: "Finally got it working! The solution was to use async/await properly instead of callbacks..."
});
```

### "Invalid threshold"

**Cause:** Threshold not between 0 and 1

**Solution:**

```typescript
// ❌ Bad
await auto_capture({
  threshold: 1.5  // Must be 0-1
});

// ✅ Good
await auto_capture({
  threshold: 0.8  // Valid
});
```

---

## Embedding Errors

### "Embeddings not generated for some items"

**Cause:** Semantic search called on items without embeddings

**Solution:**

```typescript
// Generate embeddings first
await generate_embeddings({ force: false });

// Then search
await semantic_search({
  query: "JWT authentication"
});
```

### "Model not loaded"

**Cause:** Embedding model failed to initialize

**Solutions:**

```bash
# 1. Check embeddings cache directory
ls -la embeddings/cache/

# 2. Clear cache if corrupted
rm -rf embeddings/cache/*

# 3. Verify model files exist
# The model should auto-download on first use
```

### "Embedding generation failed"

**Cause:** Text too long or encoding issue

**Solution:**

```typescript
// Content is automatically truncated if too long
// If issues persist, check for special characters:

// ❌ Might cause issues
content: "Text with null bytes \x00 or control chars"

// ✅ Sanitize content
content: content.replace(/[\x00-\x1F\x7F]/g, '')
```

---

## MCP Tool Errors

### "Item not found"

**Cause:** Invalid or non-existent item ID

**Solutions:**

```typescript
// 1. Verify item exists
const item = await get_knowledge({ id: "ki-123-abc" });
if (!item.success) {
  console.log("Item doesn't exist");
}

// 2. List items to find correct ID
const list = await list_knowledge({
  project: "my-app",
  limit: 10
});
console.log(list.data.items);
```

### "Update not allowed"

**Cause:** Trying to update immutable fields

**Immutable Fields:**

- `id`
- `created_at`
- `updated_at` (auto-managed)

**Solution:**

```typescript
// ❌ Can't update created_at
await update_knowledge({
  id: "ki-123",
  created_at: new Date().toISOString()  // Not allowed
});

// ✅ Update only mutable fields
await update_knowledge({
  id: "ki-123",
  summary: "Updated summary"
});
```

### "Invalid feedback action"

**Cause:** Action not one of: `confirm`, `reject`, `modify`

**Solution:**

```typescript
// ❌ Bad
await provide_feedback({
  action: "approve"  // Invalid
});

// ✅ Good
await provide_feedback({
  action: "confirm"  // Valid
});
```

---

## Retrieval Errors

### "No results found"

**Cause:** Search didn't match any items

**Solutions:**

```typescript
// 1. Lower threshold
await semantic_search({
  query: "authentication",
  threshold: 0.0  // Accept all similarities
});

// 2. Check if embeddings exist
await generate_embeddings({ force: false });

// 3. Try different query terms
await semantic_search({
  query: "login user session"  // Different words
});
```

### "Token budget exceeded"

**Cause:** Retrieval results exceed token budget

**Solutions:**

```typescript
// 1. Increase token budget
await tiered_retrieval({
  query: "authentication",
  token_budget: 12000  // Increase from 8000
});

// 2. Reduce tier2 limit
await tiered_retrieval({
  query: "authentication",
  tier2_options: {
    limit: 5  // Reduce from default 10
  }
});
```

---

## Detection Errors

### "No patterns detected"

**Cause:** Text doesn't match known patterns

**Solutions:**

```typescript
// 1. Lower confidence requirements
await auto_detect({
  text: "Something happened",
  require_both: false  // Don't require both pattern + sentiment
});

// 2. Check sentiment analysis separately
const sentiment = await analyze_sentiment({
  text: "Finally working!"
});
```

### "Sentiment analysis failed"

**Cause:** Text encoding or length issues

**Solutions:**

```typescript
// 1. Check text length
if (text.length > 10000) {
  text = text.slice(0, 10000);  // Truncate
}

// 2. Sanitize text
text = text.replace(/[\x00-\x1F\x7F]/g, '');

// 3. Try with shorter text
const sentiment = await analyze_sentiment({
  text: text.slice(0, 1000)
});
```

---

## Troubleshooting Guide

### Issue: Tests failing

**Symptoms:** Tests pass locally but fail in CI

**Solutions:**

```bash
# 1. Clear build artifacts
rm -rf build/
bun run build

# 2. Clear test database
rm -f knowledge.db*

# 3. Run tests again
bun test
```

### Issue: Slow embedding generation

**Symptoms:** `generate_embeddings` takes too long

**Solutions:**

```typescript
// 1. Use smaller batches
await generate_embeddings({
  batch_size: 25  // Reduce from 50
});

// 2. Check system resources
# Make sure you have enough RAM
# Model requires ~500MB

// 3. Check if model is cached
ls -lh embeddings/cache/
```

### Issue: Semantic search returns irrelevant results

**Symptoms:** Search results don't match query

**Solutions:**

```typescript
// 1. Regenerate embeddings
await generate_embeddings({
  force: true  // Regenerate all
});

// 2. Check query length
// Query should be descriptive
query: "JWT token authentication refresh"  // ✅ Good
query: "jwt"  // ❌ Too short

// 3. Adjust threshold
await semantic_search({
  query: "...",
  threshold: 0.7  // Increase for stricter matching
});
```

### Issue: Auto-capture not detecting

**Symptoms:** `auto_capture` never captures items

**Solutions:**

```typescript
// 1. Lower threshold
await auto_capture({
  text: "...",
  threshold: 0.5,  // More permissive
  preset: "aggressive"
});

// 2. Check if text matches patterns
const detection = await auto_detect({
  text: "..."
});
console.log(detection.data);

// 3. Enable auto_save
await auto_capture({
  text: "...",
  auto_save: true  // Actually save items
});
```

### Issue: Database growing too large

**Symptoms:** `knowledge.db` file size growing rapidly

**Solutions:**

```bash
# 1. Check database size
ls -lh knowledge.db

# 2. Count items
sqlite3 knowledge.db "SELECT COUNT(*) FROM knowledge_items;"

# 3. Delete old items (via API)
await list_knowledge({ limit: 100 });
// Then delete unwanted items

# 4. VACUUM database
sqlite3 knowledge.db "VACUUM;"
```

---

## Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = "true";

// Or when starting server
DEBUG=true bun run dev
```

This will log:

- SQL queries
- Embedding generation progress
- Detection confidence scores
- Error stack traces

---

## Getting Help

If you encounter an error not covered here:

1. **Check GitHub Issues** - [Existing Issues](https://github.com/hmesfin/institutional-knowledge/issues)
2. **Create New Issue** - Include:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Bun version)
3. **Enable Debug Mode** - Provide debug logs if relevant

---

## Common Error Codes

| Error | Category | Quick Fix |
|-------|----------|-----------|
| `NOT NULL constraint failed` | Database | Provide all required fields |
| `UNIQUE constraint failed` | Database | Use auto-generated IDs |
| `database is locked` | Database | Close other connections |
| `Item not found` | MCP Tool | Verify item ID exists |
| `Invalid type` | Validation | Use valid knowledge type |
| `Embeddings not generated` | Search | Run `generate_embeddings` |
| `Model not loaded` | Embeddings | Check cache directory |
| `No results found` | Search | Lower threshold or generate embeddings |

---

**Related Documentation:**

- [API Reference](./API.md)
- [Quick Start Guide](./QUICK_START.md)
- [README](../README.md)
