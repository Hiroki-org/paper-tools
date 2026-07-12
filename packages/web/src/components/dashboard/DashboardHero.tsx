import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

export function DashboardHero() {
  return (
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
  );
}
