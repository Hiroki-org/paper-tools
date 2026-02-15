"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
    (paper: S2Paper) => makeKeys(paper).some((k) => savedKeys.has(k)),
    [makeKeys, savedKeys],
  );

  const markSaved = useCallback(
    (paper: S2Paper) => {
      const keys = makeKeys(paper);
      if (keys.length === 0) return;
      setSavedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.add(k));
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
        if (!res.ok) throw new Error(data.error ?? "Recommend failed");
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
          if (record.doi)
            next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
          if (record.semanticScholarId) {
            next.add(
              `s2:${String(record.semanticScholarId).trim().toLowerCase()}`,
            );
          }
          if (record.title)
            next.add(`title:${String(record.title).trim().toLowerCase()}`);
        }
        setSavedKeys(next);
      } catch {}
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paper Recommendations</h1>

      <RecommendForm
        onRecommend={handleRecommend}
        loading={loading}
        initialPaperId={initialPaperId}
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {papers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Recommendations ({papers.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {papers.map((p) => (
              <div
                key={p.paperId}
                className="rounded-lg border border-[var(--color-border)] p-4 transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold leading-snug">
                  {p.externalIds?.DOI ? (
                    <a
                      href={`https://doi.org/${p.externalIds.DOI}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </h3>

                {p.authors && p.authors.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {p.authors.map((a) => a.name).join(", ")}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {p.year && (
                    <span className="rounded bg-gray-100 px-2 py-0.5">
                      {p.year}
                    </span>
                  )}
                  {p.venue && (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                      {p.venue}
                    </span>
                  )}
                  {p.citationCount != null && (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                      {p.citationCount} citations
                    </span>
                  )}
                  {p.isOpenAccess && (
                    <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                      Open Access
                    </span>
                  )}
                </div>

                {p.abstract && (
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                    {p.abstract}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <SaveToNotionButton
                    paper={p}
                    saved={isSaved(p)}
                    onSaved={() => markSaved(p)}
                  />
                  <a
                    href={
                      p.externalIds?.DOI
                        ? `/graph?doi=${encodeURIComponent(p.externalIds.DOI)}`
                        : `/graph?title=${encodeURIComponent(p.title)}`
                    }
                    className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    View Graph
                  </a>
                </div>
              </div>
            ))}
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
