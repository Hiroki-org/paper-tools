"use client";

import { useState, useCallback, useEffect } from "react";
import type { Paper } from "@paper-tools/core";
import type { DrilldownResult } from "@paper-tools/drilldown";
import SearchForm from "@/components/SearchForm";
import PaperCard from "@/components/PaperCard";
import SaveToNotionButton from "@/components/SaveToNotionButton";

export default function SearchPage() {
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [papers, setPapers] = useState<Paper[]>([]);
  const [drilldownResults, setDrilldownResults] = useState<DrilldownResult[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedCount, setSeedCount] = useState(5);
  const [drilldownDepth, setDrilldownDepth] = useState(1);
  const [maxPerLevel, setMaxPerLevel] = useState(10);
  const [enrich, setEnrich] = useState(false);

  const makeKeys = useCallback((doi?: string, title?: string) => {
    const keys: string[] = [];
    if (doi?.trim()) keys.push(`doi:${doi.trim().toLowerCase()}`);
    if (title?.trim()) keys.push(`title:${title.trim().toLowerCase()}`);
    return keys;
  }, []);

  const isSaved = useCallback(
    (paper: Paper) =>
      makeKeys(paper.doi, paper.title).some((k) => savedKeys.has(k)),
    [makeKeys, savedKeys],
  );

  const markSaved = useCallback(
    (paper: Paper) => {
      const keys = makeKeys(paper.doi, paper.title);
      if (keys.length === 0) return;
      setSavedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.add(k));
        return next;
      });
    },
    [makeKeys],
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
          if (record.title)
            next.add(`title:${String(record.title).trim().toLowerCase()}`);
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

  const handleSearch = useCallback(
    async (query: string, maxResults: number) => {
      setLoading(true);
      setError(null);
      setDrilldownResults([]);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
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
    },
    [],
  );

  const handleDrilldown = useCallback(async () => {
    if (papers.length === 0) return;
    setDrilldownLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/drilldown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedPapers: papers.slice(0, seedCount),
          depth: drilldownDepth,
          maxPerLevel,
          enrich,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Drilldown failed");
      setDrilldownResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDrilldownLoading(false);
    }
  }, [papers, seedCount, drilldownDepth, maxPerLevel, enrich]);

  const getGraphHref = useCallback((paper: Paper) => {
    if (paper.doi) {
      return `/graph?doi=${encodeURIComponent(paper.doi)}`;
    }
    return `/graph?title=${encodeURIComponent(paper.title)}`;
  }, []);

  const getRecommendHref = useCallback((paper: Paper) => {
    const base = paper.doi?.trim() || paper.title?.trim() || "";
    return `/recommend${base ? `?paperId=${encodeURIComponent(base)}` : ""}`;
  }, []);

  const levelDescription = useCallback(
    (level: number) => {
      if (level === 0) {
        return `シード論文（検索結果の上位 ${seedCount} 本）`;
      }
      if (level === 1) {
        return "シード論文のキーワードから発見された関連論文";
      }
      return `Level ${level - 1} のキーワードからさらに深掘りした論文`;
    },
    [seedCount],
  );

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
            <h2 className="text-lg font-semibold">Results ({papers.length})</h2>
          </div>

          <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              検索結果の上位論文をシードにして，関連キーワードで段階的に論文を深掘りします
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">シード論文数 (1-10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={seedCount}
                  onChange={(e) =>
                    setSeedCount(
                      Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                    )
                  }
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">深さ (depth)</span>
                <select
                  value={drilldownDepth}
                  onChange={(e) => setDrilldownDepth(Number(e.target.value))}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium">レベルあたり最大件数 (5-30)</span>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={maxPerLevel}
                  onChange={(e) =>
                    setMaxPerLevel(
                      Math.max(5, Math.min(30, Number(e.target.value) || 5)),
                    )
                  }
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enrich}
                  onChange={(e) => setEnrich(e.target.checked)}
                />
                <span>Crossref で補完</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDrilldown}
              disabled={drilldownLoading}
              className="rounded-lg border border-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
            >
              {drilldownLoading ? "実行中…" : "🔍 ドリルダウン開始"}
            </button>

            {drilldownResults.length > 0 && (
              <section className="space-y-4 border-t border-[var(--color-border)] pt-4">
                <h2 className="text-base font-semibold">Drilldown Results</h2>
                {drilldownResults.map((dr, li) => (
                  <div key={li} className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-700">
                        Level {dr.level} ({dr.papers.length} papers)
                      </h3>
                      <p className="text-xs text-gray-500">
                        {levelDescription(dr.level)}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {dr.papers.map((p, i) => {
                        const paper = p as Paper;
                        return (
                          <PaperCard
                            key={i}
                            paper={paper}
                            actions={
                              <>
                                <SaveToNotionButton
                                  doi={paper.doi}
                                  title={paper.title}
                                  saved={isSaved(paper)}
                                  onSaved={() => markSaved(paper)}
                                />
                                <a
                                  href={getGraphHref(paper)}
                                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                                >
                                  🕸️ グラフ
                                </a>
                                <a
                                  href={getRecommendHref(paper)}
                                  className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                                >
                                  ✨ おすすめ
                                </a>
                              </>
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {papers.map((p, i) => (
              <PaperCard
                key={i}
                paper={p}
                actions={
                  <>
                    <SaveToNotionButton
                      doi={p.doi}
                      title={p.title}
                      saved={isSaved(p)}
                      onSaved={() => markSaved(p)}
                    />
                    <a
                      href={getGraphHref(p)}
                      className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      🕸️ グラフを見る
                    </a>
                    <a
                      href={getRecommendHref(p)}
                      className="rounded border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      ✨ おすすめ
                    </a>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
