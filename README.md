# paper-tools

論文ツール群の TypeScript モノレポです。`pnpm workspaces` で各パッケージを管理します。

## Packages

- `@paper-tools/core`: 共通型・APIクライアント（DBLP/Crossref/OpenCitations/Semantic Scholar）
- `@paper-tools/scraper`: conf.researchr.org スクレイパー
- `@paper-tools/recommender`: Semantic Scholar + Notion 連携レコメンド PoC

## Setup

```bash
pnpm install
cp .env.example .env
```

`.env` には以下を設定します。

```dotenv
CROSSREF_MAILTO=your-email@example.com
NOTION_API_KEY=
S2_API_KEY=
NOTION_DATABASE_ID=
```

## Build / Test

```bash
pnpm build
pnpm test
```

## Recommender CLI

```bash
# 1本の論文から類似論文取得
node packages/recommender/dist/cli.js recommend "DOI:10.1145/3597503.3639187" --limit 10 --from recent

# Notionへ同期（重複除外）
node packages/recommender/dist/cli.js sync "DOI:10.1145/3597503.3639187" --limit 10 --dry-run

# Notion内の全論文をseedに一括推薦
node packages/recommender/dist/cli.js sync-all --limit 20 --dry-run
```

### Notion DB expected properties

必須:

- タイトル (title)
- DOI (rich_text)

任意:

- 著者 (rich_text)
- 年 (number)
- 会議/ジャーナル (rich_text)
- 被引用数 (number)
- 分野 (multi_select)
- ソース (select)
- Open Access PDF (url)
- Semantic Scholar ID (rich_text)
- 要約 (rich_text)
