import Link from "next/link";
import {
  Archive,
  ArrowRight,
  Lightbulb,
  Network,
  Search,
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

export function FeatureCards() {
  return (
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
  );
}
