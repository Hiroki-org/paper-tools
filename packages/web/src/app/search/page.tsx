"use client";

import { useState, useCallback, useEffect } from "react";
import { Network, Sparkles } from "lucide-react";
import type { Paper } from "@paper-tools/core";
import type { DrilldownResult } from "@paper-tools/drilldown";
import SearchForm from "@/components/SearchForm";
import PaperCard from "@/components/PaperCard";
import SaveToNotionButton from "@/components/SaveToNotionButton";
import { preCachePaper } from "@/components/paper/usePaperDetail";

type SearchPaper = Paper & {
  paperId?: string;
};

const fieldClassName =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10";

const actionLinkClassName =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-sm";

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
      makeKeys(paper.doi, paper.title).some((key) => savedKeys.has(key)),
    [makeKeys, savedKeys],
  );

  const markSaved = useCallback(
    (paper: Paper) => {
      const keys = makeKeys(paper.doi, paper.title);
      if (keys.length === 0) return;
      setSavedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((key) => next.add(key));
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
          if (record.doi) {
            next.add(`doi:${String(record.doi).trim().toLowerCase()}`);
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

  const handleSearch = useCallback(
    async (query: string, maxResults: number) => {
      setLoading(true);
      setError(null);
      setDrilldownResults([]);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        );
        const contentType = res.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await res.json()
          : { error: await res.text() };

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" && data.error.trim().length > 0
              ? data.error
              : `Search failed (HTTP ${res.status})`,
          );
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
      if (!res.ok) {
        throw new Error(data.error ?? "Drilldown failed");
      }

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

  const getPaperId = useCallback((paper: SearchPaper): string | null => {
    const manualId = paper.paperId?.trim();
    if (manualId) return manualId;

    if (!paper.url && paper.doi) {
      return paper.doi;
    }
    if (!paper.url) {
      return null;
    }

    try {
      const url = new URL(paper.url);
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === "semanticscholar.org" ||
        hostname === "www.semanticscholar.org"
      ) {
        const paperIndex = url.pathname.toLowerCase().indexOf("/paper/");
        if (paperIndex !== -1) {
          const afterPaper = url.pathname.substring(
            paperIndex + "/paper/".length,
          );
          const segments = afterPaper.split("/").filter(Boolean);
          const lastSegment = segments[segments.length - 1];
          if (lastSegment) {
            return decodeURIComponent(lastSegment);
          }
        }
      }
    } catch {
      // Fall back to regex parsing below.
    }

    const match = paper.url.match(/\/paper\/(?:[^/?#]+\/)?([^/?#]+)/i);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }

    if (paper.doi) {
      return paper.doi;
    }

    return null;
  }, []);

  const preCacheFromPaper = useCallback(
    (paper: SearchPaper, paperId: string) => {
      preCachePaper({
        paperId,
        title: paper.title,
        authors: (paper.authors ?? []).map((author) => ({
          authorId: "",
          name: author.name,
        })),
        year: paper.year ?? null,
        venue: paper.venue ?? "",
        citationCount: paper.citationCount ?? 0,
        externalIds: paper.doi ? { DOI: paper.doi } : {},
        url: paper.url ?? `https://www.semanticscholar.org/paper/${paperId}`,
        abstract: paper.abstract ?? null,
      });
    },
    [],
  );

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

  const renderPaperActions = useCallback(
    (paper: SearchPaper) => (
      <>
        <SaveToNotionButton
          doi={paper.doi}
          title={paper.title}
          saved={isSaved(paper)}
          onSaved={() => markSaved(paper)}
        />
        <a href={getGraphHref(paper)} className={actionLinkClassName}>
          <Network size={14} />
          Graph
        </a>
        <a href={getRecommendHref(paper)} className={actionLinkClassName}>
          <Sparkles size={14} />
          Recommend
        </a>
      </>
    ),
    [getGraphHref, getRecommendHref, isSaved, markSaved],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[var(--color-border)] bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Literature search
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Search Papers
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
            キーワードから論文を探し、検索結果を起点に引用探索や推薦にそのまま繋げられます。
            必要に応じてドリルダウンを使い、関連トピックを段階的に広げていけます。
          </p>
        </div>

        <div className="mt-6">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {papers.length > 0 && (
        <>
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Guided expansion
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
                  Drilldown
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  検索結果の上位論文をシードとして、関連キーワードから周辺研究を広げます。
                  最初に広めに集めたいときは depth
                  を上げ、精度重視ならシード数と件数を抑えるのがおすすめです。
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-semibold text-slate-800">
                  Results loaded
                </div>
                <div className="mt-1">
                  {papers.length} papers ready for drilldown
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5">
                <span className="block text-sm font-semibold text-[var(--color-text)]">
                  シード論文数
                </span>
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
                  className={fieldClassName}
                />
                <span className="block text-xs text-[var(--color-text-muted)]">
                  検索結果の先頭から使う論文数
                </span>
              </label>

              <label className="space-y-1.5">
                <span className="block text-sm font-semibold text-[var(--color-text)]">
                  Depth
                </span>
                <select
                  value={drilldownDepth}
                  onChange={(e) => setDrilldownDepth(Number(e.target.value))}
                  className={fieldClassName}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
                <span className="block text-xs text-[var(--color-text-muted)]">
                  キーワード展開の段階数
                </span>
              </label>

              <label className="space-y-1.5">
                <span className="block text-sm font-semibold text-[var(--color-text)]">
                  Max per level
                </span>
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
                  className={fieldClassName}
                />
                <span className="block text-xs text-[var(--color-text-muted)]">
                  各レベルで保持する最大件数
                </span>
              </label>

              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Metadata enrich
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                    Crossref を使って DOI や書誌情報を補完します。
                  </p>
                </div>

                <label className="mt-4 inline-flex items-center gap-3 text-sm font-medium text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={enrich}
                    onChange={(e) => setEnrich(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  Crossref で補完
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
              <p className="text-xs text-[var(--color-text-muted)]">
                Seed {seedCount} 件 / Depth {drilldownDepth} / Max per level{" "}
                {maxPerLevel}
                {enrich ? " / Crossref enrich on" : ""}
              </p>

              <button
                type="button"
                onClick={handleDrilldown}
                disabled={drilldownLoading}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {drilldownLoading ? "Drilldown running…" : "ドリルダウン開始"}
              </button>
            </div>
          </section>

          {drilldownResults.length > 0 && (
            <section className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Expanded search
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
                    Drilldown Results
                  </h2>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {drilldownResults.reduce(
                    (sum, level) => sum + level.papers.length,
                    0,
                  )}{" "}
                  papers across {drilldownResults.length} levels
                </p>
              </div>

              <div className="space-y-6">
                {drilldownResults.map((result, levelIndex) => (
                  <section
                    key={levelIndex}
                    className="rounded-2xl border border-[var(--color-border)] bg-white/85 p-5 shadow-sm backdrop-blur"
                  >
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--color-text)]">
                          Level {result.level}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          {levelDescription(result.level)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[var(--color-text-muted)]">
                        {result.papers.length} papers
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {result.papers.map((paperItem, index) => {
                        const paper = paperItem as SearchPaper;
                        const paperId = getPaperId(paper);

                        return (
                          <PaperCard
                            key={`${result.level}-${index}`}
                            paper={paper}
                            detailHref={
                              paperId
                                ? `/paper/${encodeURIComponent(paperId)}`
                                : undefined
                            }
                            onDetailNavigate={
                              paperId
                                ? () => {
                                    preCacheFromPaper(paper, paperId);
                                  }
                                : undefined
                            }
                            actions={renderPaperActions(paper)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Search results
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
                  Results ({papers.length})
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                検索結果からそのまま詳細閲覧、グラフ化、推薦に進めます。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {papers.map((paperItem, index) => {
                const paper = paperItem as SearchPaper;
                const paperId = getPaperId(paper);

                return (
                  <PaperCard
                    key={index}
                    paper={paper}
                    detailHref={
                      paperId
                        ? `/paper/${encodeURIComponent(paperId)}`
                        : undefined
                    }
                    onDetailNavigate={
                      paperId
                        ? () => {
                            preCacheFromPaper(paper, paperId);
                          }
                        : undefined
                    }
                    actions={renderPaperActions(paper)}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
