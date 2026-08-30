import type { Paper } from "@paper-tools/core";
import { useState, useCallback, useEffect } from "react";
import type { DrilldownResult } from "@paper-tools/drilldown";
import SearchPaperList from "./SearchPaperList";

interface DrilldownSectionProps {
  papers: Paper[];
  isSaved: (paper: Paper) => boolean;
  markSaved: (paper: Paper) => void;
  getGraphHref: (paper: Paper) => string;
  getRecommendHref: (paper: Paper) => string;
  getPaperId: (paper: Paper & { paperId?: string }) => string | null;
  preCacheFromPaper: (paper: Paper & { paperId?: string }, paperId: string) => void;
  fieldClassName: string;
}

export default function DrilldownSection({
  papers,
  isSaved,
  markSaved,
  getGraphHref,
  getRecommendHref,
  getPaperId,
  preCacheFromPaper,
  fieldClassName,
}: DrilldownSectionProps) {
  const [drilldownResults, setDrilldownResults] = useState<DrilldownResult[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedCount, setSeedCount] = useState(5);
  const [drilldownDepth, setDrilldownDepth] = useState(1);
  const [maxPerLevel, setMaxPerLevel] = useState(10);
  const [enrich, setEnrich] = useState(false);

  useEffect(() => {
    setDrilldownResults([]);
    setError(null);
  }, [papers]);

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
    <>
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm backdrop-blur">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
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

                <SearchPaperList
                  papers={result.papers}
                  isSaved={isSaved}
                  markSaved={markSaved}
                  getGraphHref={getGraphHref}
                  getRecommendHref={getRecommendHref}
                  getPaperId={getPaperId}
                  preCacheFromPaper={preCacheFromPaper}
                />
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
