# paper-tools

論文ツール群の TypeScript モノレポです。`pnpm workspaces` で各パッケージを管理します。

## Packages

- `@paper-tools/core`: 共通型・APIクライアント（DBLP/Crossref/OpenCitations/Semantic Scholar）
- `@paper-tools/scraper`: conf.researchr.org スクレイパー
- `@paper-tools/recommender`: Semantic Scholar + Notion 連携レコメンド PoC
- `@paper-tools/drilldown`: DBLP / Crossref をキーワード・会議で深掘り検索
- `@paper-tools/visualizer`: OpenCitations 引用グラフ可視化 CLI（JSON / DOT / Mermaid）

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

## Drilldown CLI

```bash
# キーワードで DBLP 検索
node packages/drilldown/dist/cli.js search "software testing" --limit 20

# 会議名で検索（年指定可）
node packages/drilldown/dist/cli.js venue ICSE --year 2024 --limit 50

# Crossref で検索
node packages/drilldown/dist/cli.js crossref "mutation testing" --limit 10

# シード検索 → キーワード抽出 → 深掘り（BFS）
node packages/drilldown/dist/cli.js drilldown "fault localization" \
  --seed-limit 10 --depth 2 --max-per-level 15 --enrich

# 論文タイトルから頻出キーワードを抽出
node packages/drilldown/dist/cli.js keywords "program repair" --top 10
```

- `--enrich` を付けると Crossref で DOI / 被引用数などを補完します
- `-o <file>` で結果を JSON ファイルに保存できます

## Visualizer CLI

```bash
# 1つの DOI から引用グラフを構築（JSON 出力）
node packages/visualizer/dist/cli.js graph "10.1145/3597503.3639187"

# Graphviz DOT 形式で出力
node packages/visualizer/dist/cli.js graph "10.1145/3597503.3639187" \
  --depth 2 --direction both --format dot -o graph.dot

# Mermaid 形式で出力
node packages/visualizer/dist/cli.js graph "10.1145/3597503.3639187" \
  --format mermaid

# 複数 DOI のグラフをマージして出力
node packages/visualizer/dist/cli.js multi \
  "10.1145/3597503.3639187" "10.1145/3611643.3616265" \
  --depth 1 --format mermaid -o merged.md
```

- `--direction`: `citing`（被引用）/ `cited`（参考文献）/ `both`（両方、デフォルト）
- `--format`: `json`（デフォルト）/ `dot`（Graphviz）/ `mermaid`
- `--depth`: BFS の探索深度（デフォルト 1）

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
