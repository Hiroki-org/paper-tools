"use client";

import { useState, useCallback } from "react";
import type { Paper } from "@paper-tools/core";
import type { DrilldownResult } from "@paper-tools/drilldown";
import SearchForm from "@/components/SearchForm";
import PaperCard from "@/components/PaperCard";

export default function SearchPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [drilldownResults, setDrilldownResults] = useState<DrilldownResult[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string, maxResults: number) => {
    setLoading(true);
    setError(null);
    setDrilldownResults([]);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setPapers(data.papers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrilldown = useCallback(async () => {
    if (papers.length === 0) return;
    setDrilldownLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/drilldown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedPapers: papers.slice(0, 5), depth: 1, maxPerLevel: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Drilldown failed");
      setDrilldownResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDrilldownLoading(false);
    }
  }, [papers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search Papers</h1>

      <SearchForm onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {papers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Results ({papers.length})
            </h2>
            <button
              onClick={handleDrilldown}
              disabled={drilldownLoading}
              className="rounded-lg border border-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
            >
              {drilldownLoading ? "Drilling down…" : "Drilldown (top 5)"}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {papers.map((p, i) => (
              <PaperCard key={i} paper={p} />
            ))}
          </div>
        </section>
      )}

      {drilldownResults.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Drilldown Results</h2>
          {drilldownResults.map((dr, li) => (
            <div key={li} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">
                Level {dr.level} ({dr.papers.length} papers)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {dr.papers.map((p, i) => (
                  <PaperCard key={i} paper={p as Paper} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
