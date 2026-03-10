"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import type { S2Paper } from "@paper-tools/core";
import RecommendForm from "@/components/RecommendForm";
import SaveToNotionButton from "@/components/SaveToNotionButton";

function RecommendPageClient() {
  const searchParams = useSearchParams();
  const initializedFromQuery = useRef(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [initialPaperId, setInitialPaperId] = useState<string>("");
  const [papers, setPapers] = useState<S2Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeKeys = useCallback((paper: S2Paper) => {
    const keys: string[] = [];
    if (paper.externalIds?.DOI?.trim()) {
      keys.push(`doi:${paper.externalIds.DOI.trim().toLowerCase()}`);
    }
    if (paper.paperId?.trim()) {
      keys.push(`s2:${paper.paperId.trim().toLowerCase()}`);
    }
    if (paper.title?.trim()) {
      keys.push(`title:${paper.title.trim().toLowerCase()}`);
    }
    return keys;
  }, []);

  const isSaved = useCallback(
    (paper: S2Paper) => makeKeys(paper).some((key) => savedKeys.has(key)),
    [makeKeys, savedKeys],
  );

  const markSaved = useCallback(
    (paper: S2Paper) => {
      const keys = makeKeys(paper);
      if (keys.length === 0) return;
      setSavedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((key) => next.add(key));
        return next;
      });
    },
    [makeKeys],
  );

  const handleRecommend = useCallback(
    async (params: {
      mode: "single" | "multi";
      paperId?: string;
      positiveIds?: string[];
      negativeIds?: string[];
      limit: number;
      from?: "recent" | "all-cs";
    }) => {
      setLoading(true);
      setError(null);

      try {
        const body =
          params.mode === "single"
            ? {
                paperId: params.paperId,
                limit: params.limit,
                from: params.from,
              }
            : {
                positiveIds: params.positiveIds,
                negativeIds: params.negativeIds,
                limit: params.limit,
              };

        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Recommend failed");
        }

        setPapers(data.papers ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPapers([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchArchive = async () => {
      try {
        const res = await fetch("/api/archive");
        const data = await res.json();
        if (!res.ok || cancelled) return;

        const next = new Set<string>();
        for (const record of data.records ?? []) {
          if (record.doi) {
            next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
          }
          if (record.semanticScholarId) {
            next.add(
              `s2:${String(record.semanticScholarId).trim().toLowerCase()}`,
            );
          }
          if (record.title) {
            next.add(`title:${String(record.title).trim().toLowerCase()}`);
          }
        }
        setSavedKeys(next);
      } catch (err) {
        console.warn("Failed to fetch archive:", err);
      }
    };

    void fetchArchive();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-6 shadow-sm backdrop-blur sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Lightbulb size={14} />
              Recommendation workspace
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-text)]">
              Paper Recommendations
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
              1 本の論文、または複数の論文群を起点にして関連研究を整理できます。
              保存・グラフ表示まで同じ流れで扱えるように、結果カードも統一しています。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Input
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                Single / Multi
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                論文 1 本でも複数本でも推薦を開始できます。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Workflow
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                Save or graph
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                気になる候補はそのまま Notion 保存や引用グラフへ進めます。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Results
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                Consistent cards
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                抄録・メタデータ・操作を見やすく並べています。
              </p>
            </div>
          </div>
        </div>
      </section>

      <RecommendForm
        onRecommend={handleRecommend}
        loading={loading}
        initialPaperId={initialPaperId}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !hasResults && !error && (
        <section className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/70 p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
            <Sparkles size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
            推薦候補はまだありません
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            論文 ID を入力して推薦を実行すると、ここに関連論文が表示されます。
            DOI がある候補はそのままグラフ可視化にも進められます。
          </p>
        </section>
      )}

      {hasResults && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Recommendation results
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
                {papers.length} papers
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                抄録、引用数、公開可否を比較しながら候補を絞れます。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
                Unified result cards
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
                Notion save ready
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
                Graph shortcut
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {papers.map((paper) => {
              const doi = paper.externalIds?.DOI;
              const authors =
                paper.authors?.map((author) => author.name).join(", ") || "";
              const graphHref = doi
                ? `/graph?doi=${encodeURIComponent(doi)}`
                : `/graph?title=${encodeURIComponent(paper.title)}`;

              return (
                <article
                  key={paper.paperId}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                        <Sparkles size={12} />
                        Recommended
                      </div>

                      <h3 className="text-lg font-semibold leading-snug text-[var(--color-text)]">
                        {doi ? (
                          <a
                            href={`https://doi.org/${doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors hover:text-[var(--color-primary)]"
                          >
                            {paper.title}
                          </a>
                        ) : (
                          <span>{paper.title}</span>
                        )}
                      </h3>
                    </div>

                    {(paper.url || doi) && (
                      <a
                        href={paper.url ?? `https://doi.org/${doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open paper"
                        className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--color-text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--color-primary)]"
                      >
                        <ArrowUpRight size={16} />
                      </a>
                    )}
                  </header>

                  {authors && (
                    <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                      {authors}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                    {paper.year && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                        {paper.year}
                      </span>
                    )}
                    {paper.venue && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                        {paper.venue}
                      </span>
                    )}
                    {paper.citationCount != null && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                        {paper.citationCount} citations
                      </span>
                    )}
                    {paper.isOpenAccess && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        Open Access
                      </span>
                    )}
                    {doi && (
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                        DOI available
                      </span>
                    )}
                  </div>

                  {paper.abstract ? (
                    <div className="mt-4 rounded-xl bg-slate-50/90 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        <FileText size={13} />
                        Abstract
                      </div>
                      <p className="line-clamp-4 text-sm leading-6 text-slate-600">
                        {paper.abstract}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-sm text-[var(--color-text-muted)]">
                      抄録は利用できません。
                    </div>
                  )}

                  <footer className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <SaveToNotionButton
                      paper={paper}
                      saved={isSaved(paper)}
                      onSaved={() => markSaved(paper)}
                    />
                    <a
                      href={graphHref}
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <BookOpen size={14} />
                      View Graph
                    </a>
                  </footer>
                </article>
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
        <div className="text-sm text-[var(--color-text-muted)]">
          Loading recommend page...
        </div>
      }
    >
      <RecommendPageClient />
    </Suspense>
  );
}
