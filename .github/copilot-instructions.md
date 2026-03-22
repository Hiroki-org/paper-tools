# Copilot Instructions for paper-tools

## Overview

**paper-tools** is a TypeScript monorepo containing a suite of academic paper research tools with a Next.js web UI and multiple CLI utilities. It uses pnpm workspaces to manage 8 interconnected packages:

- `@paper-tools/core` — Types and API clients (DBLP, Crossref, OpenCitations, Semantic Scholar, OpenAlex)
- `@paper-tools/web` — Next.js web interface for paper search, visualization, and recommendations
- `@paper-tools/recommender` — Paper recommendation engine (Semantic Scholar + Notion integration)
- `@paper-tools/drilldown` — Deep-dive search using keywords and venues
- `@paper-tools/bibtex` — BibTeX generation, formatting, and validation from DOI/title
- `@paper-tools/author-profiler` — Author profile analysis (h-index, coauthors, topics timeline)
- `@paper-tools/visualizer` — Citation graph visualization (JSON, GraphViz DOT, Mermaid formats)
- `@paper-tools/scraper` — Web scraper for conf.researchr.org

## Build, Test, and Lint Commands

All commands use `pnpm` (Node >= 20 required).

### Root Level

```bash
# Build all packages
pnpm build

# Test all packages
pnpm test

# Run tests for a single package
pnpm --filter @paper-tools/core test

# Clean build artifacts (dist, .next)
pnpm clean

# Install dependencies (run after pulling changes)
pnpm install
```

### Web Package (Next.js)

```bash
# Development server with hot reload (http://localhost:3000)
pnpm --filter @paper-tools/web dev

# Production build
pnpm --filter @paper-tools/web build

# Start production server
pnpm --filter @paper-tools/web start
```

### Single Package Build/Test

Each package supports:

```bash
pnpm --filter @paper-tools/{package-name} build
pnpm --filter @paper-tools/{package-name} test
pnpm --filter @paper-tools/{package-name} clean
```

## Project Structure

### Architecture Layers

1. **Core Layer** (`@paper-tools/core`)
   - Single source of truth for types (Paper, Author, Citation)
   - API clients for external services (DBLP, Crossref, Semantic Scholar, OpenAlex, OpenCitations)
   - Rate limiter with retry logic (`RateLimiter`, `fetchWithRetry`)
   - All packages import types and clients from core

2. **CLI Tools** (recommender, drilldown, bibtex, author-profiler, visualizer, scraper)
   - Standalone Node.js executables (entry point: `dist/cli.js` or `dist/index.js`)
   - Depend on `@paper-tools/core`
   - Can be run independently via `node packages/{name}/dist/{entry}`

3. **Web UI** (`@paper-tools/web`)
   - Next.js App Router (pages under `src/app/`)
   - API routes at `src/app/api/**/route.ts`
   - Integrates all other packages as dependencies
   - Notion integration via `@notionhq/client`

### Dependency Graph

```
@paper-tools/core (no dependencies)
  ├── @paper-tools/recommender
  ├── @paper-tools/drilldown
  ├── @paper-tools/bibtex
  ├── @paper-tools/author-profiler
  ├── @paper-tools/visualizer
  └── @paper-tools/web (imports all others)
```

### API Client Organization

All API clients are in `@paper-tools/core/src/`:

- `dblp-client.ts` — DBLP publication search
- `crossref-client.ts` — Crossref DOI metadata
- `semantic-scholar-client.ts` — Semantic Scholar papers and recommendations
- `openalex-client.ts` — OpenAlex author profiles and metrics
- `opencitations-client.ts` — OpenCitations citation network data
- `rate-limiter.ts` — Shared rate-limiting and retry logic

## Key Conventions

### TypeScript Configuration

- **Target:** ES2022 with Node16 module resolution (ESM)
- **Strict mode enabled** — Full type checking required
- **Output structure:** Each package outputs to `dist/` directory with generated `.d.ts` files
- **Relative imports must include extension:** Use `.js` extension in imports for ESM compatibility (e.g., `import { fn } from "./module.js"`)

### Testing

- **Framework:** Vitest with Node environment
- **Global test functions enabled** — No need to import `describe`, `it`, `expect`
- **Configuration:** `vitest.config.ts` at root
- Test files are excluded from TypeScript compilation (`**/*.test.ts` not in outDir)

### Error Handling in API Routes

API routes use regex pattern matching to extract HTTP status codes from error messages:

```typescript
const match = error.message.match(/Semantic Scholar API error:\s*(\d{3})\b/i);
```

Follow this pattern when adding new error types — embed status codes in error messages so routes can respond appropriately.

### Environment Variables

- **OpenAlex:** `OPENALEX_MAILTO` — Email for polite pool API access (defaults to a placeholder; always configure)
- **Semantic Scholar:** `S2_API_KEY` — API key for rate limit increases
- **Crossref:** `CROSSREF_MAILTO` — Email for Crossref API
- **Notion:** `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_AUTHOR_DATABASE_ID`

Use `dotenv` for local development (see `.env.example`).

### Code Style

- **Strict TypeScript:** No `any` unless unavoidable; use explicit types
- **Imports:** Organize by layer (types → utilities → clients → business logic)
- **Exports:** Named exports preferred; use `export type {}` for type-only exports
- **Function naming:** Camelcase; use clear, descriptive names (e.g., `getStatusCodeFromError`, `toPaperDetail`)

### Error Handling

All errors should include context (API name, endpoint, DOI, etc.) for debugging:

```typescript
throw new Error(`[semantic-scholar] Failed to search papers: ${error.message}`);
```

API routes extract HTTP status codes from error messages via regex:

```typescript
const match = error.message.match(/API error:\s*(\d{3})\b/i);
const status = match ? Number(match[1]) : 500;
```

Some clients (e.g., OpenCitations) return empty arrays on all errors instead of throwing.

### Logging Pattern

Use prefixed console output: `[module-name]` prefix for traceability:

```typescript
console.log("[bibtex] Generated entry for DOI: 10.1145/...");
console.error("[drilldown] Failed to enrich results");
```

### Notion Integration

Web UI limitations (important for new features):
- Only English property names are recognized from the UI
- Only `title`, `DOI`, and `Semantic Scholar ID` are populated
- CLI tools handle all optional properties including Japanese names

Required database properties:
- `title` (Title field)
- `DOI` (Rich text field)

Optional properties: Authors, Year, Venue, Citation Count, Fields, Source, Open Access PDF, Semantic Scholar ID, Summary

#### Notion Database Validation Pattern

All Notion writes validate the database schema first:

```typescript
const result = await notion.databases.retrieve({ database_id: dbId });
const validation = validateSchema(result, PROPERTY_SPECS);
if (!validation.isValid) throw new Error(`Schema mismatch: ${validation.missingFields}`);
```

Pattern uses a `PROPERTY_SPECS` object defining each property's type and required status. Always validate before create/update operations.

#### Duplicate Detection

The recommender uses smart duplicate detection:

```typescript
// Check by Semantic Scholar ID first (most accurate)
// Then by DOI
// Then by normalized title (lowercase, whitespace-normalized)
```

This prevents redundant entries when the same paper arrives from different API responses.

#### Notion API Pagination

Use cursor-based pagination with `page_size: 100`:

```typescript
const response = await notion.databases.query({
    database_id: dbId,
    page_size: 100,
    start_cursor: lastCursor,
});
```

Keep fetching while `response.has_more` is true.

## API Client Reference & Quirks

### Client Overview

All clients are in `@paper-tools/core/src/`:

| Client | File | Rate Limit | Key Required | Special Handling |
|--------|------|-----------|--------------|------------------|
| DBLP | `dblp-client.ts` | 1 req/s | No | Authors can be array or object |
| Crossref | `crossref-client.ts` | 10 req/s | No (email required) | Multiple date fields (`published` vs `published-print`) |
| Semantic Scholar | `semantic-scholar-client.ts` | 10 req/s (w/ key) / 1 per 3s | Optional (`S2_API_KEY`) | Rate limit adjusts dynamically by key |
| OpenAlex | `openalex-client.ts` | Per-minute | No (email required) | Author IDs use URL format normalization |
| OpenCitations | `opencitations-client.ts` | 5 req/s | No | **Always returns empty array on errors** |

### API Client Quirks & Workarounds

**DBLP** — Authors field can be array or object:
```typescript
// Defensive: check both formats
if (Array.isArray(author_names)) { ... } else { ... }
```

**Crossref** — Multiple date fields, pick the right one:
```typescript
const published = work["published-print"] ?? work["published"] ?? new Date();
```

**Semantic Scholar** — Rate limiter changes based on API key:
```typescript
// Key is set → 10 req/s; key is not set → 1 req/3s
const limiter = new RateLimiter(S2_API_KEY ? 10 : 1, S2_API_KEY ? 1000 : 3000);
```

**OpenAlex** — Author IDs in various formats (URLs, UUIDs):
```typescript
// Normalize: "https://openalex.org/A1234567" → "A1234567"
const authorId = rawId.match(/A\d+$/)?.[0]?.toUpperCase();
```

**OpenCitations** — Never throws, always returns empty on error:
```typescript
// By design for graceful degradation
if (citations.length === 0) {
    // Not necessarily an error, could be genuinely no citations
    console.log("[opencitations] Empty result (check if expected)");
}
```

### Rate Limiter Usage

Use the shared `RateLimiter` class for fair concurrent access:

```typescript
import { RateLimiter, fetchWithRetry } from "@paper-tools/core";

const limiter = new RateLimiter(10, 1000); // 10 requests per second
const result = await limiter.schedule(() => fetchFromApi());
```

Features:
- **Token bucket algorithm** — Fair queuing for concurrent requests
- **Exponential backoff** — Automatic retry with `baseDelay * 2^attempt` (3 retries)
- **Per-client configuration** — Each API has appropriate limits
- **Bulk worker pattern** — 3 concurrent workers for parallel fetching

For bulk operations distributing load across multiple workers:
```typescript
const workers = Array(3).fill(null).map(() => new RateLimiter(10, 1000));
const results = await Promise.all(
    ids.map((id, idx) => 
        workers[idx % 3].schedule(() => fetchOne(id))
    )
);
```

## Type Reference & Data Structures

### Core Paper Types

```typescript
// Universal Paper type used throughout
interface Paper {
    id: string;
    title: string;
    authors: Author[];
    year?: number;
    venue?: string;
    doi?: string;
    semanticScholarId?: string;
    citationCount?: number;
    isOpenAccess?: boolean;
    abstract?: string;
    externalIds?: Record<string, string>;
    fieldsOfStudy?: { category: string; source: string }[];
}

interface Author {
    name: string;
    id?: string;
    affiliations?: string[];
}

interface Citation {
    paperIdFrom: string;
    paperIdTo: string;
    context?: string;
}
```

### API-Specific Response Types

**Semantic Scholar** (most complete):
```typescript
interface S2Paper {
    paperId: string;
    title: string;
    authors: S2AuthorSummary[];
    year: number;
    venue: string;
    citationCount: number;
    influentialCitationCount: number;
    externalIds: S2ExternalIds;
    abstract?: string;
    fieldsOfStudy?: { category: string; source: string }[];
    isOpenAccess: boolean;
    openAccessPdf?: { url: string };
}
```

**Crossref** (DOI resolution):
```typescript
interface CrossrefWork {
    DOI: string;
    title: string[];
    author?: CrossrefContributor[];
    published: { "date-parts": [[number, number, number]] };
    "published-print"?: { "date-parts": [[number, number, number]] };
}
```

**DBLP** (venue-focused):
```typescript
interface DBLPPublication {
    key: string;
    title: string;
    authors: { "@text": string } | string[]; // Can be object or array!
    year?: number;
    venue: string;
}
```

**OpenAlex** (author-focused):
```typescript
interface OpenAlexAuthor {
    id: string; // URL like "https://openalex.org/A1234567"
    display_name: string;
    h_index?: number;
    cited_by_count: number;
    works_count: number;
    affiliations: OpenAlexAffiliation[];
    x_concepts: OpenAlexConcept[];
}
```

### Notion Integration Types

```typescript
interface NotionPaperRecord {
    id: string;
    properties: {
        title: { type: "title"; title: Array<{ text: { content: string } }> };
        DOI: { type: "rich_text"; rich_text: Array<{ text: { content: string } }> };
        [key: string]: any;
    };
}

interface DatabaseSchema {
    properties: Record<string, {
        id: string;
        name: string;
        type: string;
        // ... other property config
    }>;
}

interface PropertySpec {
    type: "title" | "rich_text" | "number" | "select" | "multi_select" | "url" | "date";
    required: boolean;
}

type PROPERTY_SPECS = Record<string, PropertySpec>;
```

### Command Output Types

```typescript
// Standard CLI response format
interface CLIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
    timestamp: string;
}

interface SearchResults {
    papers: Paper[];
    total: number;
    took: number; // milliseconds
}

interface DuplicateResult {
    paperId: string;
    duplicates: string[]; // Notion page IDs
    reason: "by_doi" | "by_semantic_scholar_id" | "by_title";
}
```

### Type Guards & Utilities

Common type guard patterns:

```typescript
// Check for specific API response
function isS2Paper(obj: any): obj is S2Paper {
    return typeof obj.paperId === "string" && typeof obj.title === "string";
}

// Type narrowing for unions
function isBulkRequest(body: unknown): body is { type: "bulk"; ids: string[] } {
    return (
        typeof body === "object" &&
        body !== null &&
        (body as any).type === "bulk" &&
        Array.isArray((body as any).ids)
    );
}

// Safe property access
const getAuthorName = (author: Author | null | undefined): string => {
    return author?.name ?? "Unknown";
};

// Discriminated unions (when type field determines structure)
type Result = 
    | { status: "success"; data: Paper[] }
    | { status: "error"; message: string };

const processResult = (result: Result) => {
    if (result.status === "success") {
        // TypeScript knows data exists
        return result.data;
    } else {
        // TypeScript knows message exists
        console.error(result.message);
    }
};
```

### Generics Patterns

```typescript
// Generic fetch with retry
async function fetchWithRetry<T>(
    url: string,
    options?: RequestInit,
    maxRetries: number = 3
): Promise<T> {
    // Implementation
}

// Generic response wrapper
interface ApiResponse<T> {
    ok: boolean;
    data?: T;
    error?: string;
}

// Usage:
const response = await fetchWithRetry<S2Paper>(url);
```

## CLI Tool Patterns

### Argument Parsing (Commander.js)

All CLI tools use Commander.js with consistent patterns:

```typescript
import { program } from "commander";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const version = JSON.parse(readFileSync(
    new URL("../package.json", import.meta.url), 
    "utf8"
)).version;

program.version(version);

program
    .command("search <query>")
    .description("Search for papers")
    .option("--limit <number>", "Maximum results", "10")
    .option("-o, --output <file>", "Save to JSON file")
    .action(async (query, options) => {
        const limit = parsePositiveInt(options.limit, 10);
        // Implementation...
    });
```

Helper for positive integer validation:
```typescript
function parsePositiveInt(value: string, defaultValue: number): number {
    const parsed = parseInt(value, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : defaultValue;
}
```

### CLI Action Wrapper Pattern

Use `runAction()` for consistent error handling:

```typescript
async function runAction(
    action: () => Promise<any>,
    options: { prefix: string; exitOnError?: boolean } = { prefix: "[cli]" }
): Promise<void> {
    try {
        await action();
    } catch (error) {
        console.error(
            `${options.prefix} Error: ${error instanceof Error ? error.message : String(error)}`
        );
        if (options.exitOnError !== false) process.exit(1);
    }
}

// Usage:
await runAction(async () => {
    const results = await fetchPapers(query);
    console.log(JSON.stringify(results, null, 2)); // stdout
}, { prefix: "[search]" });
```

### Output Format Convention

- **Progress/logs** → `stderr` (visible but doesn't pollute JSON output)
- **Results** → `stdout` (JSON format, machine-readable)
- **File output** → Use `-o <file>` flag

```typescript
console.error(`[search] Fetching papers...`); // stderr
const results = await getPapers(query);
console.log(JSON.stringify(results, null, 2)); // stdout → can pipe to jq, etc.
if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(results, null, 2));
}
```

## Next.js API Routes

### Request Parameter Validation

Validate and normalize at route entry:

```typescript
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
    params: { paperId: string };
};

export async function GET(
    req: NextRequest,
    context: RouteContext
) {
    const { paperId } = context.params;
    
    // Validate
    if (!paperId || typeof paperId !== "string") {
        return NextResponse.json(
            { error: "Missing paperId parameter" },
            { status: 400 }
        );
    }
    
    const normalizedId = paperId.trim();
    // Continue...
}
```

### Error Response Pattern

Extract HTTP status codes from error messages:

```typescript
function getStatusCodeFromError(error: unknown): number | null {
    if (!(error instanceof Error)) {
        return null;
    }

    // Extract status code from error message: "Semantic Scholar API error: 404"
    const match = error.message.match(/API error:\s*(\d{3})\b/i);
    if (!match?.[1]) {
        return null;
    }

    const status = Number(match[1]);
    return Number.isInteger(status) ? status : null;
}

// In handler:
try {
    const result = await fetchData(paperId);
    return NextResponse.json(result);
} catch (error) {
    const status = getStatusCodeFromError(error) ?? 500;
    return NextResponse.json(
        {
            error: error instanceof Error
                ? error.message
                : "Unknown error",
        },
        { status }
    );
}
```

### Type Discrimination for Requests

Use type guards with union types:

```typescript
type RequestBody = 
    | { type: "single"; paperId: string }
    | { type: "bulk"; paperIds: string[] };

function isBulkRequest(body: unknown): body is { type: "bulk"; paperIds: string[] } {
    return (
        typeof body === "object" &&
        body !== null &&
        (body as any).type === "bulk" &&
        Array.isArray((body as any).paperIds)
    );
}

// In handler:
const body = await req.json();
if (isBulkRequest(body)) {
    // Handle bulk: { type: "bulk"; paperIds: [...] }
} else {
    // Handle single: { type: "single"; paperId: "..." }
}
```

### Bulk Processing with Concurrency

Use 3 concurrent workers with shared rate limiter for balanced throughput:

```typescript
import { RateLimiter } from "@paper-tools/core";

const limiter = new RateLimiter(10, 1000); // 10 req/s
const workers = Array(3).fill(null).map(() => ({ limiter }));

const results = await Promise.all(
    paperIds.map((paperId, index) =>
        workers[index % 3].limiter.schedule(() => fetchPaperDetails(paperId))
    )
);
```

### Notion Pagination in Routes

Cursor-based pagination pattern:

```typescript
import { Client as NotionClient } from "@notionhq/client";

const notion = new NotionClient({ auth: apiKey });

let allResults: any[] = [];
let cursor: string | undefined;

while (true) {
    const response = await notion.databases.query({
        database_id: dbId,
        page_size: 100, // Max per request
        start_cursor: cursor,
    });

    allResults.push(...response.results);

    if (!response.has_more) {
        break;
    }

    cursor = response.next_cursor ?? undefined;
}

return NextResponse.json(allResults);
```

## Testing Patterns (Vitest)

### Mocking Fetch Requests

```typescript
import { beforeEach, describe, it, expect, vi } from "vitest";

describe("API client", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn()
        );
    });

    it("fetches and parses JSON", async () => {
        const mockFetch = global.fetch as any;
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ 
                data: [{ id: "1", title: "Paper" }] 
            }),
        });

        const result = await fetchPapers("query");
        expect(result).toEqual({ data: [...] });
    });
});
```

### Rate Limiter Tests with Fake Timers

```typescript
import { beforeEach, afterEach, it, vi } from "vitest";
import { RateLimiter } from "./rate-limiter";

it("respects rate limits", async () => {
    vi.useFakeTimers();
    
    const limiter = new RateLimiter(2, 1000); // 2 req/s
    let callCount = 0;
    const increment = () => { callCount++; return callCount; };

    const p1 = limiter.schedule(increment); // Executes immediately
    const p2 = limiter.schedule(increment); // Executes immediately
    const p3 = limiter.schedule(increment); // Queued, waits 1000ms

    expect(callCount).toBe(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callCount).toBe(3);

    vi.useRealTimers();
});
```

### Environment Variable Testing

Use `vi.resetModules()` to reload code with different env vars:

```typescript
it("uses default when env var missing", async () => {
    delete process.env.S2_API_KEY;
    vi.resetModules(); // Force reimport
    
    const { createRateLimiter } = await import("./client");
    const limiter = createRateLimiter();
    
    // Test: should use slower limit without key
});

it("uses faster limit with API key", async () => {
    process.env.S2_API_KEY = "test-key-123";
    vi.resetModules();
    
    const { createRateLimiter } = await import("./client");
    const limiter = createRateLimiter();
    
    // Test: should use faster limit with key
});
```

### Notion Client Mocking

```typescript
const mockNotionClient = {
    databases: {
        retrieve: vi.fn().mockResolvedValue({
            id: "db-123",
            properties: {
                title: { type: "title" },
                DOI: { type: "rich_text" },
            },
        }),
        query: vi.fn().mockResolvedValue({
            results: [],
            has_more: false,
            next_cursor: null,
        }),
    },
    pages: {
        create: vi.fn().mockResolvedValue({ id: "page-456" }),
        update: vi.fn().mockResolvedValue({}),
    },
};

// Use in tests:
vi.mock("@notionhq/client", () => ({
    Client: vi.fn(() => mockNotionClient),
}));
```

### Testing CLI Commands

```typescript
import { Command } from "commander";

it("parses search command", async () => {
    const program = new Command();
    let capturedQuery: string;
    let capturedLimit: string;

    program
        .command("search <query>")
        .option("--limit <number>", "Results limit", "10")
        .action((query, options) => {
            capturedQuery = query;
            capturedLimit = options.limit;
        });

    await program.parseAsync(["search", "mutation testing", "--limit", "20"]);

    expect(capturedQuery).toBe("mutation testing");
    expect(capturedLimit).toBe("20");
});
```

## Monorepo Workflow

### Adding a Dependency

Use `pnpm add` at workspace root or target package:

```bash
# Add to root (shared devDependency)
pnpm add -w -D typescript

# Add to specific package
pnpm add --filter @paper-tools/web some-package
```

### Referencing Internal Packages

Use workspace protocol in `package.json`:

```json
"@paper-tools/core": "workspace:*"
```

Pnpm automatically links packages in development.

### Building and Publishing

- Packages export through `exports` field in `package.json` (main entry points)
- Types are generated during build (`tsc`)
- All packages include source maps and declaration maps for debugging

## Recommended MCP Servers

### For Web Testing & Automation

**Playwright MCP** — Use for testing the Next.js web UI and browser automation:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

Useful for:
- End-to-end tests of search, graph visualization, and recommendation features
- Browser automation for testing Notion integration flows
- Visual regression testing of UI components

### For CLI Tool Development

**Bash MCP** — Run shell commands to test CLI tools and build scripts:

```json
{
  "mcpServers": {
    "bash": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-bash"]
    }
  }
}
```

Useful for:
- Running CLI commands: `node packages/recommender/dist/cli.js`
- Verifying build and test outputs
- Package manager operations

### For Repository Analysis

**Git MCP** — Analyze commit history and changes:

```json
{
  "mcpServers": {
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"]
    }
  }
}
```

Useful for:
- Understanding recent API client changes
- Tracking package evolution and dependencies

## Common Issues & Debugging

### Build Failures

**TypeScript compilation errors (using `pnpm build`)**

```bash
# Check for ES module issues
error TS1479: The current file is a CommonJS module and cannot use named export.

# Fix: Ensure package.json has "type": "module"
# Check: Are you importing from a CommonJS package?
```

**Missing relative import extensions**

```typescript
// ❌ Wrong (runtime error)
import { fn } from "./module"

// ✅ Correct (ESM with Node16)
import { fn } from "./module.js"
```

**Circular dependency issues**

```bash
# Run: pnpm build --filter @paper-tools/core
# This isolates which package causes the cycle
# Check imports: core ← recommender ← web (should be one direction)
```

### Test Failures

**"ReferenceError: fetch is not defined"**

```typescript
// Fix: Mock fetch in test setup
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
```

**"Timeout: not all promises completed"**

```typescript
// Issue: Forgot to await async operation
// Fix: Add await to all promises
const result = await limiter.schedule(async () => {...});
```

**"Cannot find module .js"**

```bash
# Cause: TypeScript test file isn't transpiled
# Fix: Ensure vitest.config.ts has globals: true, environment: "node"
# Or: Use tsx loader for Node.js files
```

### Runtime Issues

**API Route: "Semantic Scholar API error: 429"**

This is a rate limit error (HTTP 429). The regex extraction should work:
```typescript
const match = error.message.match(/API error:\s*(\d{3})\b/i);
// Extracts: 429
```

The route will respond with 429 automatically. Client should retry after delay.

**Notion: "Schema validation failed"**

```typescript
// Issue: Database properties don't match expected schema
// Debug: Check PROPERTY_SPECS matches actual Notion database
// Common issues:
// - Property named "DOI" but expecting "Doi"
// - Rich Text field instead of Title
// - Japanese property names in Web UI (use CLI instead)
```

**OpenAlex: Empty author results**

```typescript
// Cause: Author name not found, or very common name
// Fix: Try exact name match, or iterate results more carefully
// or Use Semantic Scholar as fallback
```

**OpenCitations: Always empty results**

```typescript
// This is NOT an error - OpenCitations returns empty on network failures
// Instead of throwing, it returns []
// Check: If genuinely no citations, is that expected?
// Debug: Verify DOI is valid before asking OpenCitations
```

**Bibtex generation fails with "No data available"**

The bibtex CLI uses a fallback chain:
```
DOI → DBLP title search → Semantic Scholar title search → Fail
```

If all fail:
```typescript
// Check: Is the DOI/title valid?
// Try: Search manually on Semantic Scholar
// If found: Debug why API didn't find it
```

### Environment Configuration Issues

**S2_API_KEY not being recognized**

```bash
# Issue: Rate limiter doesn't adapt to key
# Check: Did you set env var BEFORE importing the client?
export S2_API_KEY=your-key
node packages/recommender/dist/cli.js recommend ...

# Fix: Reload the module if env var changed mid-process
delete require.cache[require.resolve('./client')];
```

**NOTION_API_KEY failures**

```typescript
// Issue: Could be invalid key, wrong database ID, or missing permissions
// Debug steps:
// 1. Verify key with: curl https://api.notion.com/v1/users/me -H "Authorization: Bearer KEY"
// 2. Check database ID: Is it the actual DB ID or page ID?
// 3. Verify Notion integration has read/write access
```

**CROSSREF_MAILTO / OPENALEX_MAILTO not working**

```bash
# These APIs require proper email (polite pool)
# Check: Email format is valid
# Fix: Set in .env before running
CROSSREF_MAILTO=your-email@example.com
OPENALEX_MAILTO=your-email@example.com
```

### Monorepo Issues

**"Cannot find module @paper-tools/core"**

```bash
# Issue: Workspace packages not linked
# Fix: pnpm install

# Verify: pnpm ls @paper-tools/core
# Should show: @paper-tools/core linked from packages/core
```

**Building one package breaks others**

```bash
# Cause: Interdependent packages
# Fix: Build in correct order
pnpm --filter @paper-tools/core build
pnpm --filter @paper-tools/recommender build
pnpm --filter @paper-tools/web build

# Or just:
pnpm build (builds all in dependency order)
```

**Node version mismatch**

```bash
# Error: something about features not available
# Check: node --version (should be >= 20)
# Fix: Use nvm or update Node.js
node --version  # >= 20.0.0 required
```

### Web UI Debugging

**"Pages are not being found" in Next.js dev mode**

```bash
# Fix: Ensure server is running
pnpm --filter @paper-tools/web dev

# Clear cache if needed:
pnpm --filter @paper-tools/web clean
rm -rf packages/web/.next
pnpm --filter @paper-tools/web dev
```

**API routes returning 500 with vague errors**

```typescript
// Add detailed logging in route handler:
console.error("[route] Detailed error:", {
    paperId,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
});

// Return detailed error in development:
const isDev = process.env.NODE_ENV === "development";
return NextResponse.json({
    error: isDev ? error.message : "Internal Server Error",
    details: isDev ? (error as Error).stack : undefined,
}, { status: 500 });
```

**Notion integration failing silently**

```bash
# Debug: Check Notion credentials
node packages/recommender/dist/cli.js sync "DOI:..." --dry-run

# This shows exactly what's happening without modifying Notion
```

### Performance Debugging

**Web UI slow to load papers**

```typescript
// Cause: Too many API requests or rate limiting
// Debug: Check RateLimiter logs
console.error("[rate-limiter] Queue length:", limiter.getQueueLength());

// Fix: Reduce concurrent workers or adjust limits
const limiter = new RateLimiter(5, 1000); // Slower but more reliable
```

**CLI tool hangs**

```bash
# Likely cause: Rate limiter waiting on external API
# Check: Is the API responding?
curl https://api.semanticscholar.org/graph/v1/paper/search?query=test

# Fix: Add timeout
timeout 30 node packages/recommender/dist/cli.js recommend "DOI:..." --limit 5
```

## Quick Reference: File Locations

```
packages/
├── core/src/
│   ├── dblp-client.ts            ← DBLP API
│   ├── crossref-client.ts         ← Crossref API
│   ├── semantic-scholar-client.ts ← Semantic Scholar API
│   ├── openalex-client.ts         ← OpenAlex API
│   ├── opencitations-client.ts    ← OpenCitations API
│   └── rate-limiter.ts            ← Rate limiting & retry logic
│
├── web/src/app/api/               ← Next.js API routes
│   ├── paper/[paperId]/route.ts   ← Single paper details
│   ├── search/route.ts            ← Paper search
│   ├── recommend/route.ts         ← Recommendations
│   └── ...
│
├── recommender/src/
│   ├── cli.ts                     ← CLI entry point
│   └── sync.ts                    ← Notion sync logic
│
├── bibtex/src/
│   ├── cli.ts                     ← BibTeX CLI
│   └── bib-generator.ts           ← Generation logic
│
├── author-profiler/src/
│   ├── cli.ts                     ← Author profiler CLI
│   └── profile.ts                 ← Profile analysis
│
└── visualizer/src/
    ├── cli.ts                     ← Visualizer CLI
    └── graph-builder.ts           ← Citation graph construction
```
