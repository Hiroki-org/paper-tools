import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Lightbulb,
  Network,
  Search,
  Settings,
  UserRoundSearch,
} from "lucide-react";

const cards = [
  {
    title: "Search",
    description:
      "キーワードや研究テーマから論文を探し、結果をそのまま保存・可視化・推薦に繋げられます。",
    href: "/search",
    eyebrow: "Discover papers",
    icon: Search,
  },
  {
    title: "Author Profiler",
    description:
      "著者の h-index、代表論文、共著ネットワーク、トピック遷移をまとめて確認できます。",
    href: "/authors",
    eyebrow: "Research people",
    icon: UserRoundSearch,
  },
  {
    title: "Citation Graph",
    description:
      "DOI やタイトルを起点に引用ネットワークを構築し、論文間のつながりを俯瞰できます。",
    href: "/graph",
    eyebrow: "Visualize context",
    icon: Network,
  },
  {
    title: "Recommend",
    description:
      "基準となる論文から関連研究を取得して、次に読むべき候補を整理できます。",
    href: "/recommend",
    eyebrow: "Find next reads",
    icon: Lightbulb,
  },
  {
    title: "Archive",
    description:
      "Notion と接続し、保存済み論文や BibTeX 生成を落ち着いた一覧画面で管理できます。",
    href: "/archive",
    eyebrow: "Manage knowledge",
    icon: Archive,
  },
];

const quickHighlights = [
  {
    label: "Search → Graph",
    description: "気になる論文の関係性をすぐ確認",
  },
  {
    label: "Search → Recommend",
    description: "探索したテーマをそのまま深掘り",
  },
  {
    label: "Save → Archive",
    description: "Notion に蓄積して再利用しやすく",
  },
];

const workflowSteps = [
  {
    title: "検索して候補を揃える",
    description: "キーワードや手法名で論文を探し、まずは母集団を作ります。",
  },
  {
    title: "引用関係と推薦で周辺を把握する",
    description:
      "Graph と Recommend を使って、重要論文と派生研究を整理します。",
  },
  {
    title: "Notion に保存して継続的に育てる",
    description:
      "後で読み返す論文や BibTeX を Archive からまとめて管理できます。",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
        <div className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-8 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Research dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Paper Tools Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-text-muted)]">
            論文探索、引用ネットワークの可視化、関連研究の推薦、Notion
            への保存までを、落ち着いたワークスペースとして一つにまとめました。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Search papers
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/archive"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Open archive
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {quickHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {item.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Daily flow
              </p>
              <h2 className="mt-2 text-xl font-semibold">Quick Start</h2>
            </div>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Settings size={14} />
              DB を変更
            </Link>
          </div>

          <ol className="mt-5 space-y-4">
            {workflowSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[var(--color-text-muted)]">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-slate-100 p-3 text-[var(--color-primary)]">
                  <Icon size={20} />
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-300 transition-colors group-hover:text-[var(--color-primary)]"
                />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {card.eyebrow}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                {card.description}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
