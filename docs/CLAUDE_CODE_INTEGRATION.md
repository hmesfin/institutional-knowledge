# Claude Code Integration Guide

How to integrate the Institutional Knowledge MCP server with Claude Code.

## Prerequisites

- Node.js/Bun installed
- Claude Code installed and configured
- Institutional Knowledge MCP server built

## Installation

### 1. Build the MCP Server

```bash
cd institutional-knowledge
bun install
bun run build
```

### 2. Create MCP Configuration

Create or edit the Claude Code MCP configuration file:

**macOS/Linux:**
```bash
~/.config/claude-code/mcp.json
```

**Windows:**
```
%APPDATA%\claude-code\mcp.json
```

Add the server configuration:

```json
{
  "mcpServers": {
    "institutional-knowledge": {
      "command": "bun",
      "args": [
        "run",
        "/path/to/institutional-knowledge/src/index.ts"
      ],
      "env": {
        "KNOWLEDGE_DB_PATH": "/path/to/institutional-knowledge/knowledge.db"
      }
    }
  }
}
```

**Important:** Replace `/path/to/institutional-knowledge` with your actual absolute path.

### 3. Restart Claude Code

Close and restart Claude Code to load the new MCP server.

## Usage in Claude Code

Once configured, you can use the knowledge tools directly in Claude Code conversations:

### Example 1: Capture Knowledge

```
User: I just fixed a race condition in the authentication handler.
The solution was to use mutex locks around shared state access.

Claude: I'll capture this solution in your knowledge base.

[Uses capture_knowledge tool]
```

### Example 2: Search for Knowledge

```
User: Have we dealt with JWT token expiration before?

Claude: Let me search your knowledge base...

[Uses semantic_search tool]
Found: "Fix JWT authentication expiration" - Set token expiration to 24h
and implement refresh token rotation...
```

### Example 3: Auto-Capture

```
User: Finally got it working! After hours of debugging I realized
the issue was that we weren't closing database connections properly.
Added connection pooling with maxIdle: 10 and it works perfectly now.

Claude: That sounds like a valuable knowledge moment! Let me capture it...

[Uses auto_capture tool]
✅ Auto-captured as solution (92% confidence)
```

## Available Tools

### Core CRUD
- `capture_knowledge` - Save a knowledge item
- `get_knowledge` - Retrieve by ID
- `list_knowledge` - List with filters
- `update_knowledge` - Update an item
- `delete_knowledge` - Delete an item

### Search & Retrieval
- `semantic_search` - Semantic similarity search
- `generate_embeddings` - Generate vector embeddings
- `tiered_retrieval` - Smart multi-tier retrieval

### Detection & Analysis
- `auto_detect` - Detect knowledge moments
- `analyze_sentiment` - Analyze emotional tone
- `evaluate_confidence` - Evaluate confidence score

### Auto-Capture
- `auto_capture` - End-to-end auto-capture
- `provide_feedback` - Feedback on captured items
- `record_feedback` - Learn from feedback

## Testing the Integration

### Test 1: Basic Capture

In Claude Code, try:

```
Please capture this knowledge:
Summary: Fix memory leak in event handler
Content: The event listener wasn't being removed, causing memory leaks.
Solution: Add cleanup in useEffect return function.
Type: solution
Project: frontend-app
File: src/components/Widget.tsx
```

Expected: Claude captures the knowledge and confirms with ID.

### Test 2: Semantic Search

```
Search for knowledge about memory leaks or event listeners.
```

Expected: Claude finds relevant items even with different wording.

### Test 3: Auto-Capture

```
I've been debugging this race condition for hours. Finally fixed it!
The problem was that async operations weren't being awaited properly.
Added await keywords and wrapped in try/catch blocks.
```

Expected: Claude detects this as a knowledge moment and offers to capture it.

### Test 4: List and Filter

```
Show me all solutions for the frontend-app project.
```

Expected: Claude lists matching items with pagination.

### Test 5: Tiered Retrieval

```
Get comprehensive context about authentication in backend-api project.
Include recent wins and use up to 10000 tokens.
```

Expected: Claude provides multi-tier results with project overview, semantic matches, and usage tracking.

## Troubleshooting

### Server Not Found

**Error:** "MCP server 'institutional-knowledge' not found"

**Solutions:**
1. Check path in mcp.json is absolute
2. Verify the server starts: `bun run src/index.ts`
3. Check Claude Code logs for errors
4. Ensure dependencies are installed: `bun install`

### Database Locked

**Error:** "database is locked"

**Solutions:**
1. Only one Claude Code instance should access the database
2. Check for other processes using the database
3. Delete WAL files: `rm knowledge.db-wal knowledge.db-shm`

### Tools Not Available

**Error:** Tools don't show up in Claude Code

**Solutions:**
1. Restart Claude Code
2. Check mcp.json syntax is valid
3. Verify the server runs without errors
4. Check Claude Code MCP configuration location

### Slow Performance

**Symptoms:** Tools take too long to respond

**Solutions:**
1. Generate embeddings first: Use `generate_embeddings` tool
2. Use smaller limits in searches
3. Check system resources (RAM, CPU)
4. Adjust database path to fast storage

## Configuration Options

### Environment Variables

```json
{
  "env": {
    "KNOWLEDGE_DB_PATH": "/path/to/knowledge.db",
    "EMBEDDINGS_CACHE_DIR": "/path/to/embeddings/cache",
    "DEBUG": "true"  // Enable verbose logging
  }
}
```

### Performance Tuning

```json
{
  "args": [
    "run",
    "/path/to/src/index.ts"
  ],
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=4096"  // Increase memory
  }
}
```

## Best Practices

### 1. Use Descriptive Summaries

```
Good: "Fix race condition in WebSocket message handler"
Bad: "Bug fix"
```

### 2. Add Relevant Tags

```
Tags: ["authentication", "jwt", "security", "production"]
```

### 3. Verify Solutions

```
Please capture this as a verified solution:
...
```

### 4. Use Projects to Organize

```
Capture this for the backend-api project...
```

### 5. Provide Feedback

When auto-capture captures something:
- "confirm" if it's valuable
- "reject" if it's noise
- "modify" if it needs editing

This improves the detection system over time.

## Example Conversations

### Session 1: Debugging Session

```
User: I'm getting a CORS error when calling the API from the frontend.

Claude: Let me search your knowledge base...

[Uses semantic_search]

Found similar issue: "Fix CORS error in development"
Solution: Add cors middleware with origin whitelist.

Claude: Based on your knowledge, you should add CORS middleware.
Would you like me to help implement this?

User: Yes, that worked! But I also had to add credentials support.

Claude: Let me capture this update...

[Uses capture_knowledge]

Captured! Your knowledge base now has the complete solution.
```

### Session 2: Auto-Capture Workflow

```
User: Finally solved the authentication issue! The JWT tokens were expiring
too early. Set expiration to 24 hours and implemented refresh token rotation.
This was causing users to be logged out unexpectedly.

Claude: That's a valuable knowledge moment! Let me auto-capture it...

[Uses auto_capture]

✅ Captured as solution (89% confidence)
ID: ki-1234567890-abc

Claude: I've captured this. Is the information correct?
Action: confirm, reject, or modify?

User: confirm

Claude: Great! Feedback recorded. This helps improve future detection.
```

### Session 3: Project Context

```
User: I'm working on the user-profile feature in frontend-app.
What should I know about this project?

Claude: Let me get comprehensive context...

[Uses tiered_retrieval]

📊 Project Overview:
- 23 items in frontend-app
- 12 solutions, 5 patterns, 4 gotchas, 2 wins

Recent Wins:
- "Successfully deployed user authentication flow"
- "Fixed responsive design issues in mobile view"

Relevant Items:
1. "Use React Query for data fetching"
2. "Avoid prop drilling with context API"
3. "Watch for memory leaks in useEffect"

Claude: Based on your knowledge base, here are key patterns for frontend-app:
[provides detailed context]
```

## Advanced Usage

### Custom Confidence Threshold

```
Please auto-capture this, but use a lower threshold since I want to be more permissive.
Use threshold: 0.7
```

### Project-Specific Search

```
Search only in the backend-api project for database-related issues.
```

### Feedback Loop

```
The last auto-capture was wrong, please reject it.
[Later]
The auto-capture is getting better! That one was accurate.
```

## Performance Benchmarks

Expected performance on typical hardware:

| Operation | Time |
|-----------|------|
| capture_knowledge | < 50ms |
| get_knowledge | < 20ms |
| list_knowledge (10 items) | < 100ms |
| semantic_search (5 results) | < 200ms |
| tiered_retrieval | < 500ms |
| auto_capture | < 300ms |

## Security Considerations

### Database Location

Store database in a secure location:

```json
{
  "env": {
    "KNOWLEDGE_DB_PATH": "/secure/path/knowledge.db"
  }
}
```

### Access Control

The MCP server runs with your user permissions. Ensure:
- Database file has appropriate permissions (600)
- Cache directory is not world-writable
- Sensitive information is tagged appropriately

## Next Steps

1. ✅ Install and configure
2. ✅ Test basic operations
3. ✅ Try auto-capture
4. ✅ Provide feedback to improve detection
5. 📚 Build your knowledge base over time

## Support

If you encounter issues:

1. Check the [Error Handling Guide](./ERRORS.md)
2. Review [API Reference](./API.md)
3. Open an issue on GitHub
4. Enable debug mode for detailed logs

---

**Happy knowledge building!** 🧠✨
