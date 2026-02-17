export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-3xl">
      <h1>利用規約</h1>
      <p>
        Paper Tools は研究支援を目的としたツールです。利用者は自己責任で本サービスを利用するものとします。
      </p>
      <h2>提供内容</h2>
      <ul>
        <li>論文検索・推薦・グラフ可視化・Notion保存機能</li>
        <li>Notion Public Integration (OAuth) を通じた連携</li>
      </ul>
      <h2>禁止事項</h2>
      <ul>
        <li>法令違反、公序良俗に反する利用</li>
        <li>第三者権利を侵害する目的での利用</li>
      </ul>
      <h2>免責</h2>
      <p>本サービスの継続性・正確性について保証せず、利用により生じる損害について責任を負いません。</p>
    </article>
  );
}
