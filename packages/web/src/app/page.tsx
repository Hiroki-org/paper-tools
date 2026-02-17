import Link from "next/link";

const cards = [
  {
    title: "Search",
    description: "キーワードで論文を検索し、ドリルダウン分析で関連論文を深掘りします。",
    href: "/search",
    icon: "🔍",
  },
  {
    title: "Citation Graph",
    description: "DOI から引用ネットワークを構築し、Cytoscape.js で可視化します。",
    href: "/graph",
    icon: "🕸️",
  },
  {
    title: "Recommend",
    description:
      "Semantic Scholar の推薦 API で関連論文を提案。Notion への保存も可能です。",
    href: "/recommend",
    icon: "💡",
  },
  {
    title: "Archive",
    description: "Notion データベースに保存済みの論文一覧を閲覧・管理します。",
    href: "/archive",
    icon: "📚",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Paper Tools Dashboard</h1>
          <p className="mt-2 text-gray-500">
            論文検索・引用グラフ可視化・推薦・アーカイブを統合した研究支援ツール
          </p>
        </div>
        <a
          href="/setup"
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-slate-50"
        >
          DB を変更
        </a>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-shadow hover:shadow-md"
          >
            <span className="text-3xl">{c.icon}</span>
            <h2 className="mt-3 text-lg font-semibold group-hover:text-[var(--color-primary)]">
              {c.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{c.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="font-semibold">Quick Start</h2>
        <ol className="mt-3 list-inside list-decimal space-y-1.5 text-sm text-gray-600">
          <li>
            <strong>Search</strong> でキーワード検索 → 興味のある論文を見つける
          </li>
          <li>
            <strong>Graph</strong> で DOI を入力 → 引用ネットワークを可視化
          </li>
          <li>
            <strong>Recommend</strong> で論文 ID を入力 → 関連論文を取得
          </li>
          <li>
            <strong>Archive</strong> で気になった論文を Notion に保存・管理
          </li>
        </ol>
      </section>
    </div>
  );
}
