# @paper-tools/web

Next.js (App Router) ベースの Web UI です。

## 起動方法

```bash
pnpm --filter @paper-tools/web dev
```

ブラウザで `http://localhost:3000` を開きます。

## OAuth 設定（Notion Public Integration）

`packages/web/.env.local` に以下を設定:

```dotenv
NOTION_OAUTH_CLIENT_ID=
NOTION_OAUTH_CLIENT_SECRET=
COOKIE_SECRET=
```

## 使い方

1. `/login` で **Notion と接続**
2. OAuth 完了後 `/setup` で保存先データベースを選択
3. `/search` `/graph` `/recommend` で論文を探索し、`Save to Notion` で保存
4. `/archive` で保存済み論文を確認

## 主要ルート

- `/login` : OAuth ログイン
- `/setup` : データベース選択
- `/search` : 論文検索 + ドリルダウン
- `/graph` : 引用グラフ可視化
- `/recommend` : 関連論文推薦
- `/archive` : Notion 保存一覧
- `/privacy` : プライバシーポリシー
- `/terms` : 利用規約
