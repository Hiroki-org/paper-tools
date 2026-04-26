"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Lightbulb,
  Network,
  Sparkles,
  Info,
} from "lucide-react";
import type { S2Paper, Paper, Author } from "@paper-tools/core";
import RecommendForm from "@/components/RecommendForm";
import SaveToNotionButton from "@/components/SaveToNotionButton";
import PaperCard from "@/components/PaperCard";
import { useSavedPapers } from "@/hooks/useSavedPapers";
import { useRecommend } from "./hooks/useRecommend";

function RecommendPageClient() {
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const [initialPaperId, setInitialPaperId] = useState<string>("");

  const { isSaved, markSaved } = useSavedPapers();
  const { papers, loading, error, handleRecommend } = useRecommend();

  useEffect(() => {
    if (initializedFromQuery.current) return;

    const paperId = searchParams.get("paperId")?.trim() ?? "";
    if (!paperId) return;

    initializedFromQuery.current = true;
    setInitialPaperId(paperId);

    void handleRecommend({
      mode: "single",
      paperId,
      limit: 10,
      from: "recent",
    });
  }, [searchParams, handleRecommend]);

  const hasResults = papers.length > 0;

  const s2ToPaper = (s2: S2Paper): Paper => ({
    title: s2.title,
    authors: (s2.authors ?? []).map((a): Author => ({ name: a.name })),
    doi: s2.externalIds?.DOI,
    year: s2.year,
    venue: s2.venue,
    abstract: s2.abstract,
    url: s2.url,
    citationCount: s2.citationCount,
    referenceCount: s2.referenceCount,
  });

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
              <Lightbulb size={12} />
              AI Recommendations
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Discover Related Research
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              1 本の論文、または複数の論文群を起点にして周辺研究を探索できます。
              Semantic Scholar のグラフ構造を活用し、内容の類似性や引用関係から最適な論文を提案します。
            </p>
          </div>

          <div className="hidden shrink-0 grid-cols-1 gap-3 lg:grid lg:w-72">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <LayoutGrid size={14} />
                Consistent Workflow
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                保存やグラフ表示まで同じ流れで扱えるように、結果カードの操作を統一しています。
              </p>
            </div>
          </div>
        </div>
      </header>

      <RecommendForm
        onRecommend={handleRecommend}
        loading={loading}
        initialPaperId={initialPaperId}
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          <div className="flex items-center gap-2 font-bold">
            <Info size={16} />
            {error}
          </div>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && !hasResults && !error && (
        <section className="rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50/50 p-16 text-center shadow-inner">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm transition-transform hover:scale-110">
            <Sparkles size={28} />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-800">
            推薦候補はまだありません
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            論文 ID を入力して推薦を実行すると、ここに関連論文が表示されます。
          </p>
        </section>
      )}

      {hasResults && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/50 px-6 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {papers.length} Recommendations
              </h2>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
              <p className="text-xs font-medium text-slate-500">
                Semantic Scholar API による類似論文
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {papers.map((s2) => {
              const paper = s2ToPaper(s2);
              const doi = paper.doi;
              const graphHref = doi
                ? `/graph?doi=${encodeURIComponent(doi)}`
                : `/graph?title=${encodeURIComponent(paper.title)}`;

              return (
                <PaperCard
                  key={s2.paperId}
                  paper={paper}
                  detailHref={`/paper/${s2.paperId}`}
                  actions={
                    <>
                      <SaveToNotionButton
                        paper={s2}
                        saved={isSaved(s2)}
                        onSaved={() => markSaved(s2)}
                      />
                      <a
                        href={graphHref}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-sm"
                      >
                        <Network size={14} />
                        Graph
                      </a>
                    </>
                  }
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function RecommendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-slate-400">
          <Sparkles className="animate-pulse" size={48} />
          <p className="text-sm font-medium">Loading recommendations...</p>
        </div>
      }
    >
      <RecommendPageClient />
    </Suspense>
  );
}
