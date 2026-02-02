# MCP Tools API Reference

Complete API documentation for all Institutional Knowledge MCP server tools.

## Table of Contents

- [MCP Tools API Reference](#mcp-tools-api-reference)
  - [Table of Contents](#table-of-contents)
  - [Core CRUD Operations](#core-crud-operations)
    - [capture\_knowledge](#capture_knowledge)
    - [get\_knowledge](#get_knowledge)
    - [list\_knowledge](#list_knowledge)
    - [update\_knowledge](#update_knowledge)
    - [delete\_knowledge](#delete_knowledge)
  - [Search \& Retrieval](#search--retrieval)
    - [semantic\_search](#semantic_search)
    - [generate\_embeddings](#generate_embeddings)
    - [tiered\_retrieval](#tiered_retrieval)
  - [Detection \& Analysis](#detection--analysis)
    - [auto\_detect](#auto_detect)
    - [analyze\_sentiment](#analyze_sentiment)
    - [evaluate\_confidence](#evaluate_confidence)
  - [Auto-Capture Workflow](#auto-capture-workflow)
    - [auto\_capture](#auto_capture)
    - [provide\_feedback](#provide_feedback)
    - [record\_feedback](#record_feedback)
  - [Error Handling](#error-handling)
    - [Common Errors](#common-errors)
  - [Type Definitions](#type-definitions)
  - [Quick Start](#quick-start)

---

## Core CRUD Operations

### capture_knowledge

Manually save a knowledge item to the database.

**Input Schema:**

```typescript
{
  summary: string;              // Required: Brief summary (min 1 char)
  content: string;              // Required: Full content (min 1 char)
  type: "solution" | "pattern" | "gotcha" | "win" | "troubleshooting"; // Required
  project: string;              // Required: Project name (min 1 char)
  file_context: string;         // Required: File/context info (min 1 char)
  tags?: string[];              // Optional: Array of tags
  decision_rationale?: string;  // Optional: Why this decision was made
  alternatives_considered?: string[]; // Optional: Alternative approaches
  solution_verified?: boolean;  // Optional: Whether solution was verified
  related_issues?: string[];    // Optional: Related issue IDs
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    id: string;                 // Generated ID
    summary: string;
    content: string;
    type: string;
    project: string;
    file_context: string;
    tags: string[] | null;
    created_at: string;         // ISO 8601 timestamp
    updated_at: string;         // ISO 8601 timestamp
  };
}
```

**Error Response:**

```typescript
{
  success: false;
  error: string;                // Error message
}
```

**Example:**

```typescript
// Capture a solution
const result = await capture_knowledge({
  summary: "Fix race condition in API",
  content: "Added mutex lock around shared state access...",
  type: "solution",
  project: "my-api",
  file_context: "src/handlers/user.ts",
  tags: ["concurrency", "bugfix"],
  solution_verified: true
});
```

---

### get_knowledge

Retrieve a single knowledge item by ID.

**Input Schema:**

```typescript
{
  id: string;                   // Required: Knowledge item ID
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    id: string;
    summary: string;
    content: string;
    type: string;
    project: string;
    file_context: string;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    access_count: number;       // Usage tracking
    last_accessed_at: string | null;
  };
}
```

**Error Response:**

```typescript
{
  success: false;
  error: "Item not found";
}
```

**Example:**

```typescript
const item = await get_knowledge({ id: "ki-1234567890-abc123" });
```

---

### list_knowledge

List and filter knowledge items with pagination.

**Input Schema:**

```typescript
{
  type?: string;                // Optional: Filter by type
  project?: string;             // Optional: Filter by project
  tags?: string[];              // Optional: Filter by tags (any match)
  limit?: number;               // Optional: Max results (default: 10, max: 100)
  offset?: number;              // Optional: Pagination offset (default: 0)
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    items: Array<{
      id: string;
      summary: string;
      type: string;
      project: string;
      created_at: string;
    }>;
    total: number;              // Total matching items
    limit: number;
    offset: number;
  };
}
```

**Example:**

```typescript
// List all solutions for a project
const result = await list_knowledge({
  type: "solution",
  project: "my-api",
  limit: 20
});
```

---

### update_knowledge

Update an existing knowledge item.

**Input Schema:**

```typescript
{
  id: string;                   // Required: Item ID
  summary?: string;             // Optional: New summary
  content?: string;             // Optional: New content
  type?: string;                // Optional: New type
  project?: string;             // Optional: New project
  file_context?: string;        // Optional: New file context
  tags?: string[];              // Optional: New tags
  decision_rationale?: string;  // Optional: New rationale
  alternatives_considered?: string[]; // Optional: New alternatives
  solution_verified?: boolean;  // Optional: New verification status
  related_issues?: string[];    // Optional: New related issues
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    id: string;
    // ... all item fields
    updated_at: string;         // New update timestamp
  };
}
```

**Error Response:**

```typescript
{
  success: false;
  error: "Item not found";
}
```

**Example:**

```typescript
const result = await update_knowledge({
  id: "ki-1234567890-abc123",
  summary: "Fix race condition (updated with more details)",
  solution_verified: true
});
```

---

### delete_knowledge

Delete a knowledge item.

**Input Schema:**

```typescript
{
  id: string;                   // Required: Item ID to delete
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    id: string;                 // Deleted item ID
  };
}
```

**Error Response:**

```typescript
{
  success: false;
  error: "Item not found";
}
```

**Example:**

```typescript
const result = await delete_knowledge({
  id: "ki-1234567890-abc123"
});
```

---

## Search & Retrieval

### semantic_search

Search knowledge items by semantic similarity using vector embeddings.

**Input Schema:**

```typescript
{
  query: string;                // Required: Search query (min 1 char)
  limit?: number;               // Optional: Max results (default: 5, max: 20)
  threshold?: number;           // Optional: Similarity threshold 0-1 (default: 0)
  type?: string;                // Optional: Filter by type
  project?: string;             // Optional: Filter by project
  tags?: string[];              // Optional: Filter by tags
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    query: string;
    results: Array<{
      id: string;
      summary: string;
      content: string;
      type: string;
      project: string;
      similarity: number;       // 0-1 similarity score
    }>;
    total_results: number;
  };
}
```

**Error Response:**

```typescript
{
  success: false;
  error: "Embeddings not generated for some items";
  data: {
    results: [...];             // Partial results
    total_results: number;
  };
}
```

**Example:**

```typescript
// Search for similar solutions
const result = await semantic_search({
  query: "race condition mutex locking",
  threshold: 0.7,
  limit: 10
});
```

---

### generate_embeddings

Generate vector embeddings for knowledge items that don't have them.

**Input Schema:**

```typescript
{
  force?: boolean;              // Optional: Regenerate existing embeddings (default: false)
  batch_size?: number;          // Optional: Items per batch (default: 50, max: 100)
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    generated: number;          // Embeddings created
    skipped: number;            // Items already with embeddings
    failed: number;             // Items that failed
    total_processed: number;
    duration_ms: number;        // Processing time
  };
}
```

**Example:**

```typescript
const result = await generate_embeddings({
  batch_size: 50
});
console.log(`Generated ${result.data.generated} embeddings`);
```

---

### tiered_retrieval

Multi-tier knowledge retrieval with smart token budgeting and diversification.

**Input Schema:**

```typescript
{
  query: string;                // Required: Search query
  project?: string;             // Optional: Filter by project
  tier1?: boolean;              // Optional: Enable project fingerprint (default: true)
  tier2?: boolean;              // Optional: Enable semantic search (default: true)
  tier3?: boolean;              // Optional: Enable usage boosting (default: false)
  tier4?: boolean;              // Optional: Enable smart capping (default: true)
  token_budget?: number;        // Optional: Max tokens (default: 8000)
  diversify?: "type" | "project" | "both" | "none"; // Optional: Diversification strategy (default: "type")
  tier2_options?: {
    limit?: number;
    threshold?: number;
    tags?: string[];
  };
  tier3_options?: {
    boost_factor?: number;      // Usage boost weight (default: 0.2)
  };
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    query: string;
    tier1: {
      enabled: boolean;
      fingerprint?: {
        total_items: number;
        by_type: Record<string, number>;
        recent_wins: number;
      };
    };
    tier2: {
      enabled: boolean;
      results_count: number;
    };
    tier3: {
      enabled: boolean;
      boosted_count: number;
    };
    tier4: {
      enabled: boolean;
      enforced: boolean;
      token_count: number;
      diversity_score: number;
    };
    results: Array<KnowledgeItem>;
    total_results: number;
    total_tokens: number;
  };
}
```

**Example:**

```typescript
const result = await tiered_retrieval({
  query: "authentication JWT tokens",
  project: "my-api",
  token_budget: 10000,
  diversify: "type"
});
```

---

## Detection & Analysis

### auto_detect

Detect knowledge moments using pattern matching and sentiment analysis.

**Input Schema:**

```typescript
{
  text: string;                 // Required: Text to analyze (min 10 chars)
  require_both?: boolean;       // Optional: Require both pattern AND sentiment (default: false)
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    detected: boolean;
    confidence: number;         // 0-1 overall confidence
    pattern_matches: Array<{
      pattern: string;
      confidence: number;
      type: string;
    }>;
    sentiment: {
      score: number;            // -1 to 1
      label: "positive" | "negative" | "neutral";
      shift_detected: boolean;
    };
    suggested_type: string;
  };
}
```

**Example:**

```typescript
const result = await auto_detect({
  text: "Finally got it working after hours of debugging!"
});
```

---

### analyze_sentiment

Analyze the sentiment and emotional tone of text.

**Input Schema:**

```typescript
{
  text: string;                 // Required: Text to analyze (min 1 char)
  detect_shifts?: boolean;      // Optional: Detect sentiment shifts (default: true)
  min_delta?: number;           // Optional: Minimum shift magnitude (default: 0.3)
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    overall: {
      score: number;            // -1 (negative) to 1 (positive)
      label: "positive" | "negative" | "neutral";
      positive_count: number;
      negative_count: number;
    };
    timeline: Array<{
      text: string;
      score: number;
      label: string;
    }>;
    shifts: Array<{
      from: string;
      to: string;
      delta: number;
      at_index: number;
    }>;
    has_problem_to_solution: boolean;
  };
}
```

**Example:**

```typescript
const result = await analyze_sentiment({
  text: "This was terrible and awful. Finally good and working!",
  detect_shifts: true
});
```

---

### evaluate_confidence

Evaluate confidence score for text being a valuable knowledge moment.

**Input Schema:**

```typescript
{
  text: string;                 // Required: Text to evaluate (min 1 char)
  preset?: "conservative" | "moderate" | "aggressive"; // Optional: Scoring preset
  custom_weights?: {
    pattern?: number;           // Pattern weight (default: 0.35)
    sentiment?: number;         // Sentiment weight (default: 0.30)
    textLength?: number;        // Text length weight (default: 0.15)
    structure?: number;         // Structure weight (default: 0.20)
  };
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    score: number;              // 0-1 confidence score
    level: "high" | "medium" | "low";
    factors: {
      pattern: {
        detected: boolean;
        confidence: number;
        weight: number;
      };
      sentiment: {
        score: number;
        weight: number;
      };
      text_length: {
        score: number;
        weight: number;
      };
      structure: {
        score: number;
        weight: number;
      };
    };
    thresholds: {
      high: number;
      medium: number;
      low: number;
    };
  };
}
```

**Example:**

```typescript
const result = await evaluate_confidence({
  text: "Finally working! The solution was to use async/await properly.",
  preset: "moderate"
});
```

---

## Auto-Capture Workflow

### auto_capture

Run end-to-end auto-capture workflow with configurable options.

**Input Schema:**

```typescript
{
  text: string;                 // Required: Text to process (min 50 chars)
  threshold?: number;           // Optional: Confidence threshold 0-1 (default: 0.9)
  auto_save?: boolean;          // Optional: Auto-save high confidence (default: false)
  notify?: boolean;             // Optional: Show notifications (default: true)
  preset?: "conservative" | "moderate" | "aggressive"; // Optional: Threshold preset
  max_captures?: number;        // Optional: Max items to capture (default: 5, max: 10)
}
```

**Output:**

```typescript
{
  content: Array<{
    type: "text";
    text: string;               // Formatted markdown report
  }>;
}
```

**Response includes:**

- Auto-Capture Results summary
- Captured items (if auto_save=true)
- Flagged for review items
- Statistics (total processed, captured, flagged)
- Notifications (if notify=true)
- Next steps

**Example:**

```typescript
const result = await auto_capture({
  text: "Finally got it working! The solution was to clear the cache first...",
  threshold: 0.8,
  auto_save: true,
  preset: "moderate"
});
```

---

### provide_feedback

Provide feedback on auto-captured or detected knowledge items.

**Input Schema:**

```typescript
{
  item_id: string;              // Required: Knowledge item ID
  action: "confirm" | "reject" | "modify"; // Required: Feedback action
  comment?: string;             // Optional: Feedback comment
}
```

**Output:**

```typescript
{
  content: Array<{
    type: "text";
    text: string;               // Formatted feedback response
  }>;
}
```

**Actions:**

- `confirm`: Mark as valuable, keeps item in database
- `reject`: Mark as noise, deletes item from database
- `modify`: Mark for editing, keeps item for manual modification

**Example:**

```typescript
const result = await provide_feedback({
  item_id: "ki-1234567890-abc123",
  action: "confirm",
  comment: "This was very helpful!"
});
```

---

### record_feedback

Record feedback to improve confidence scoring over time.

**Input Schema:**

```typescript
{
  id: string;                   // Required: Detection ID
  feedback: "confirm" | "reject"; // Required: Feedback type
  confidence: number;           // Required: Confidence at time of feedback (0-1)
  factors?: string[];           // Optional: Contributing factors
}
```

**Output:**

```typescript
{
  success: true;
  data: {
    recorded: true;
    feedback: {
      id: string;
      feedback: string;
      confidence: number;
      factors: string[];
      timestamp: string;
    };
    stats: {
      total: number;
      confirmed: number;
      rejected: number;
      confirmation_rate: number;
    };
  };
}
```

**Example:**

```typescript
const result = await record_feedback({
  id: "detect-123",
  feedback: "confirm",
  confidence: 0.85,
  factors: ["pattern", "sentiment"]
});
```

---

## Error Handling

All tools follow a consistent error response pattern:

```typescript
{
  success: false;
  error: string;                // Human-readable error message
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Item not found` | Invalid ID | Verify the item exists |
| `Database error` | SQLite constraint violated | Check input constraints |
| `Validation error` | Invalid input format | Fix input data |
| `Embeddings not generated` | Missing embeddings | Run `generate_embeddings` first |
| `Model not loaded` | Embedding model not initialized | Check model configuration |

---

## Type Definitions

Full TypeScript types are exported from `src/types/index.ts`:

```typescript
import type {
  KnowledgeItem,
  CreateKnowledgeItem,
  UpdateKnowledgeItem,
  KnowledgeItemType,
  SemanticSearchOptions,
  SemanticSearchResult,
} from './types';
```

---

## Quick Start

See [README.md](../README.md) for installation and basic usage instructions.
