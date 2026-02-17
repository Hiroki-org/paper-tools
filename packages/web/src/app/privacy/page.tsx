export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-3xl">
      <h1>プライバシーポリシー</h1>
      <p>
        Paper Tools は、ユーザーが選択した Notion ワークスペース内のページ/データベース情報を表示・更新するために、Notion OAuth 認証情報を利用します。
      </p>
      <h2>取得するデータ</h2>
      <ul>
        <li>OAuth で許可された Notion データベース情報</li>
        <li>ユーザーが選択した論文情報（タイトル、DOI など）</li>
      </ul>
      <h2>データ保存</h2>
      <ul>
        <li>アクセストークン/リフレッシュトークンは HttpOnly Cookie に保存します</li>
        <li>サーバー側の永続DB（Supabase等）は利用しません</li>
      </ul>
      <h2>第三者提供</h2>
      <p>法令に基づく場合を除き、取得データを第三者に提供しません。</p>
    </article>
  );
}
