"use client";

import { useState, useCallback } from "react";
import type { S2Paper } from "@paper-tools/core";
import RecommendForm from "@/components/RecommendForm";
import SaveToNotionButton from "@/components/SaveToNotionButton";

export default function RecommendPage() {
  const [papers, setPapers] = useState<S2Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            ? { paperId: params.paperId, limit: params.limit, from: params.from }
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
    []
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paper Recommendations</h1>

      <RecommendForm onRecommend={handleRecommend} loading={loading} />

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
                  <SaveToNotionButton paper={p} />
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
