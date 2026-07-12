import Link from "next/link";
import { Settings } from "lucide-react";

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

export function QuickStart() {
  return (
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
  );
}
