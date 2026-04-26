import { useState, useCallback } from "react";
import type { S2Paper } from "@paper-tools/core";

export function useRecommend() {
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

  return {
    papers,
    loading,
    error,
    handleRecommend,
  };
}
