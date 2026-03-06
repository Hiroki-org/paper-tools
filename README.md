# paper-tools

A TypeScript monorepo for a suite of academic paper tools. It uses `pnpm workspaces` to manage multiple packages.

## Packages

| Package                        | Description                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `@paper-tools/core`            | Common types and API clients (DBLP, Crossref, OpenCitations, Semantic Scholar)                             |
| `@paper-tools/scraper`         | Web scraper for `conf.researchr.org`                                                                       |
| `@paper-tools/recommender`     | Proof of Concept (PoC) for paper recommendations linking Semantic Scholar and Notion                       |
| `@paper-tools/drilldown`       | Deep-dive search using keywords and venues via DBLP and Crossref                                           |
| `@paper-tools/visualizer`      | CLI for visualizing OpenCitations citation graphs (outputs in JSON, DOT, or Mermaid)                       |
| `@paper-tools/bibtex`          | CLI for generating, formatting, exporting, and validating BibTeX entries from DOI/title and Notion records |
| `@paper-tools/author-profiler` | CLI/Service for author profile analysis (h-index, coauthors, topics timeline, Notion sync)                 |
| `@paper-tools/web`             | Next.js Web UI for searching, visualizing, and recommending papers                                         |

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your API keys and configuration:

   ```dotenv
   CROSSREF_MAILTO=your-email@example.com
   NOTION_API_KEY=your_notion_api_key
   S2_API_KEY=your_semantic_scholar_api_key
   NOTION_DATABASE_ID=your_notion_database_id
   ```

## Build and Test

```bash
# Build all packages
pnpm build

# Run tests
pnpm test
```

## Web UI

### Starting the Application

- **Local Development Server (Hot Reload):**

  ```bash
  pnpm --filter @paper-tools/web dev
  ```

  Open `http://localhost:3000` in your browser.

- **Production Build (Local Verification):**

  ```bash
  pnpm --filter @paper-tools/web build
  pnpm --filter @paper-tools/web start
  ```

### Key Pages & Features

- `/search` — Paper search. From the search result cards, you can quickly execute actions such as **Save to Notion**, **View Graph**, and **Recommend**.
- `/graph` — Citation graph visualization. Supports DOI, paper titles, and Semantic Scholar IDs as inputs. Can be automatically built via URL queries (e.g., `/graph?doi=10.1145/...`).
- `/recommend` — Displays paper recommendations based on a specified paper or your saved papers.
- `/archive` — List of papers saved to Notion (requires Notion authentication and database setup).
- `/authors` — Search authors and view profile analytics (h-index, top papers, coauthor graph, topic timeline).

### Notion Integration

- Ensure `NOTION_API_KEY` and `NOTION_DATABASE_ID` are set in your `.env` file (see the Setup section).
- The "Save" button will function only if the Notion configuration is valid.

### Troubleshooting

- **Cannot save to Notion:** Check the Notion credentials in your `.env` file.
- **Dependency errors:** Run `pnpm install` again to ensure all packages are linked.
- **Build failures:** Run `pnpm --filter @paper-tools/web build` and inspect the logs for detailed error messages.

## CLI Tools Usage

### Recommender CLI

```bash
# Get similar papers from a single paper
node packages/recommender/dist/cli.js recommend "DOI:10.1145/3597503.3639187" --limit 10 --from recent

# Sync recommendations to Notion (excluding duplicates)
node packages/recommender/dist/cli.js sync "DOI:10.1145/3597503.3639187" --limit 10 --dry-run

# Recommend papers using all papers in your Notion DB as seeds
node packages/recommender/dist/cli.js sync-all --limit 20 --dry-run
```

### Drilldown CLI

```bash
# Search DBLP by keyword
node packages/drilldown/dist/cli.js search "software testing" --limit 20

# Search by venue (with optional year)
node packages/drilldown/dist/cli.js venue ICSE --year 2024 --limit 50

# Search Crossref
node packages/drilldown/dist/cli.js crossref "mutation testing" --limit 10

# Drill-down (BFS): Seed search -> Keyword extraction -> Deep dive
node packages/drilldown/dist/cli.js drilldown "fault localization" \
  --seed-limit 10 --depth 2 --max-per-level 15 --enrich

# Extract frequent keywords from paper titles
node packages/drilldown/dist/cli.js keywords "program repair" --top 10
```

- Adding the `--enrich` flag complements the results with DOI, citation counts, etc., via Crossref.
- Use `-o <file>` to save the results to a JSON file.

### BibTeX CLI

```bash
# Fetch BibTeX from DOI or title
node packages/bibtex/dist/index.js get "10.1145/3597503.3639187"
node packages/bibtex/dist/index.js get "coverage guided fuzzing" --key-format short

# Export BibTeX for papers in Notion DB
node packages/bibtex/dist/index.js export --format bibtex --output papers.bib

# Validate BibTeX file (or use '-' for stdin)
node packages/bibtex/dist/index.js validate papers.bib
cat papers.bib | node packages/bibtex/dist/index.js validate -
```

- `get` uses the priority order: Crossref (DOI) → DBLP (title) → Semantic Scholar (title→DOI→Crossref).
- `export` reads the Notion DB specified by `NOTION_DATABASE_ID` and generates BibTeX entries, prioritizing DOIs.
- `validate` detects missing required fields, duplicate keys, and duplicate DOIs.

### Author Profiler CLI

```bash
# Resolve author by name and show profile metrics
node packages/author-profiler/dist/cli.js profile "Geoffrey Hinton"

# Resolve by Semantic Scholar Author ID
node packages/author-profiler/dist/cli.js profile 1741105 --id

# Show top cited papers
node packages/author-profiler/dist/cli.js papers "Yoshua Bengio" --top 10

# Show coauthor counts (depth 1 only)
node packages/author-profiler/dist/cli.js coauthors "Yann LeCun" --depth 1

# Save profile to Notion author database
node packages/author-profiler/dist/cli.js save "Geoffrey Hinton" --dry-run
```

- `save` utilizes `NOTION_API_KEY` and `NOTION_AUTHOR_DATABASE_ID`.
- Recommended properties for the Notion Author DB:
  - `Name` (title)
  - `Semantic Scholar ID` (text)
  - `H-Index` (number)
  - `Citation Count` (number)
  - `Paper Count` (number)
  - `Affiliations` (text)
  - `Homepage` (url)
  - `Last Updated` (date)

### Visualizer CLI

```bash
# Build a citation graph from a single DOI (JSON output)
node packages/visualizer/dist/cli.js graph "10.1145/3597503.3639187"

# Output in Graphviz DOT format
node packages/visualizer/dist/cli.js graph "10.1145/3597503.3639187" \
  --depth 2 --direction both --format dot -o graph.dot

# Output in Mermaid format
node packages/visualizer/dist/cli.js graph "10.1145/3597503.3639187" \
  --format mermaid

# Merge graphs for multiple DOIs and output
node packages/visualizer/dist/cli.js multi \
  "10.1145/3597503.3639187" "10.1145/3611643.3616265" \
  --depth 1 --format mermaid -o merged.md
```

#### Options:

- `--direction`: `citing` (papers citing this), `cited` (references), or `both` (default).
- `--format`: `json` (default), `dot` (Graphviz), or `mermaid`.
- `--depth`: BFS exploration depth (default: `1`).

## Notion Database Schema Requirements

> **Note:** The Web UI currently has limitations compared to the CLI tools. When saving papers from the Web UI, only English property names are recognized, and only `title`, `DOI`, and `Semantic Scholar ID` are populated. The CLI tools, however, correctly handle all optional properties (including Japanese names).

**Required Properties:**

- `title` (Title)
- `DOI` (Rich text)

**Optional Properties:**

- `Authors` (Rich text)
- `Year` (Number)
- `Venue` (Rich text)
- `Citation Count` (Number)
- `Fields` (Multi-select)
- `Source` (Select)
- `Open Access PDF` (URL)
- `Semantic Scholar ID` (Rich text)
- `Summary` (Rich text)
