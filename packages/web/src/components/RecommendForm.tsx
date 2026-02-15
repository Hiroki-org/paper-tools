"use client";

import { useEffect, useState } from "react";

type Mode = "single" | "multi";

interface RecommendFormProps {
  onRecommend: (params: {
    mode: Mode;
    paperId?: string;
    positiveIds?: string[];
    negativeIds?: string[];
    limit: number;
    from?: "recent" | "all-cs";
  }) => void;
  loading?: boolean;
  initialPaperId?: string;
}

export default function RecommendForm({
  onRecommend,
  loading = false,
  initialPaperId = "",
}: RecommendFormProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [paperId, setPaperId] = useState("");
  const [positiveIds, setPositiveIds] = useState("");
  const [negativeIds, setNegativeIds] = useState("");
  const [limit, setLimit] = useState(10);
  const [from, setFrom] = useState<"recent" | "all-cs">("recent");

  useEffect(() => {
    if (!initialPaperId.trim()) return;
    setMode("single");
    setPaperId(initialPaperId.trim());
  }, [initialPaperId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "single") {
      if (!paperId.trim()) return;
      onRecommend({ mode, paperId: paperId.trim(), limit, from });
    } else {
      const pos = positiveIds
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (pos.length === 0) return;
      const neg = negativeIds
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      onRecommend({
        mode,
        positiveIds: pos,
        negativeIds: neg.length > 0 ? neg : undefined,
        limit,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "single"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Single Paper
        </button>
        <button
          type="button"
          onClick={() => setMode("multi")}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "multi"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Multiple Papers
        </button>
      </div>

      {mode === "single" ? (
        <div>
          <label htmlFor="paper-id" className="mb-1 block text-sm font-medium">
            Paper ID (DOI, S2 Paper ID, ArXiv ID, etc.)
          </label>
          <input
            id="paper-id"
            type="text"
            value={paperId}
            onChange={(e) => setPaperId(e.target.value)}
            placeholder="10.1145/3292500.3330672"
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
      ) : (
        <>
          <div>
            <label
              htmlFor="positive-ids"
              className="mb-1 block text-sm font-medium"
            >
              Positive Paper IDs (one per line or comma-separated)
            </label>
            <textarea
              id="positive-ids"
              rows={3}
              value={positiveIds}
              onChange={(e) => setPositiveIds(e.target.value)}
              placeholder={
                "10.1145/3292500.3330672\n10.1038/s41586-021-03819-2"
              }
              disabled={loading}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div>
            <label
              htmlFor="negative-ids"
              className="mb-1 block text-sm font-medium"
            >
              Negative Paper IDs (optional)
            </label>
            <textarea
              id="negative-ids"
              rows={2}
              value={negativeIds}
              onChange={(e) => setNegativeIds(e.target.value)}
              placeholder="Papers to exclude from recommendations…"
              disabled={loading}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </>
      )}

      {/* Options Row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <label htmlFor="rec-limit" className="mb-1 block text-sm font-medium">
            Limit
          </label>
          <input
            id="rec-limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={loading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        {mode === "single" && (
          <div className="w-36">
            <label
              htmlFor="rec-from"
              className="mb-1 block text-sm font-medium"
            >
              Pool
            </label>
            <select
              id="rec-from"
              value={from}
              onChange={(e) => setFrom(e.target.value as "recent" | "all-cs")}
              disabled={loading}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="recent">Recent</option>
              <option value="all-cs">All CS</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading…" : "Get Recommendations"}
        </button>
      </div>
    </form>
  );
}
